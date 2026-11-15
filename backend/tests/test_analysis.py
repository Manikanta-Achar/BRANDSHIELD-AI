from io import BytesIO
from unittest.mock import AsyncMock

import pymupdf
import pytest
from bson import ObjectId
from docx import Document
from fastapi import HTTPException

from app.services.ai.response_validator import validate_assessment
from app.services.extraction import docx_extractor, pdf_extractor
from app.utils.file_validation import validate_file
from scripts.seed_demo import SAMPLE


def test_ai_rejects_fabricated_citation():
    passage = {"id": str(ObjectId()), "version": "1", "revision": 1, "content": "Up to 10 hours"}
    raw = {
        "verdict": "Supported",
        "original": "15 hours",
        "explanation": "It is supported",
        "confidence": 0.95,
        "evidence": {"id": "fabricated", "version": "1", "revision": 1, "quote": "Up to 10 hours"},
        "correction": "",
    }
    result, evidence, warning = validate_assessment(raw, [passage], "Battery 15 hours")
    assert result.verdict == "Unverified" and evidence is None and warning
    raw["evidence"]["id"] = passage["id"]
    raw["evidence"]["quote"] = "fabricated passage"
    assert validate_assessment(raw, [passage], "Battery 15 hours")[0].verdict == "Unverified"
    raw["original"] = "Invented text"
    with pytest.raises(ValueError):
        validate_assessment(raw, [passage], "Battery 15 hours")


def test_real_document_extraction():
    doc = Document()
    doc.add_paragraph("TechNova document")
    table = doc.add_table(rows=1, cols=2)
    table.cell(0, 0).text, table.cell(0, 1).text = "Battery", "10 hours"
    output = BytesIO()
    doc.save(output)
    data = output.getvalue()
    assert validate_file("../../unsafe.docx", data) == ("unsafe.docx", "DOCX")
    result = docx_extractor.extract(data)
    assert "Battery\t10 hours" in result["text"] and result["metadata"]["images"] == []
    pdf = pymupdf.open()
    pdf.new_page().insert_text((72, 72), "Readable TechNova PDF")
    assert "Readable TechNova PDF" in pdf_extractor.extract(pdf.tobytes())["text"]
    scanned = pymupdf.open()
    scanned.new_page()
    with pytest.raises(HTTPException):
        pdf_extractor.extract(scanned.tobytes())
    with pytest.raises(HTTPException):
        validate_file("malware.pdf", b"not a pdf")
    with pytest.raises(HTTPException):
        docx_extractor.extract(b"corrupt docx")


async def test_persisted_analysis_snapshots_and_ai_failure(env):
    await env.db.workspaces.update_one({"_id": ObjectId(env.workspace)}, {"$set": {"consent": True}})
    env.app.state.ai_provider = type(
        "BrokenProvider", (), {"configured": True, "assess": AsyncMock(side_effect=TimeoutError)}
    )()
    s = await env.submission()
    assert {f["check"] for f in s["findings"]} == {"R1", "R2", "R3", "R4", "R5"}
    assert s["aiStatus"] == "partial" and any("unavailable" in w for w in s["warnings"])
    reloaded = (await env.call("GET", f"/submissions/{s['id']}")).json()
    assert reloaded["findings"] == s["findings"]
    fact = next(f["evidence"] for f in s["findings"] if f["check"] == "R4")
    await env.db.knowledge_items.update_one(
        {"_id": ObjectId(fact["id"])}, {"$set": {"content": "Up to 20 hours", "version": "2.0"}}
    )
    reloaded = (await env.call("GET", f"/submissions/{s['id']}")).json()
    assert (
        next(f["evidence"] for f in reloaded["findings"] if f["check"] == "R4")["content"] == "Up to 10 hours"
    )
    assert await env.db.ai_disclosures.count_documents({"contentVersionId": s["currentVersionId"]}) == 1


async def test_disabled_ai_never_calls_provider(env):
    provider = type("Provider", (), {"configured": True, "assess": AsyncMock()})()
    env.app.state.ai_provider = provider
    s = await env.submission()
    assert s["aiStatus"] == "skipped"
    provider.assess.assert_not_called()


async def test_upload_gridfs_and_failure(env):
    doc = Document()
    doc.add_paragraph(SAMPLE)
    output = BytesIO()
    doc.save(output)
    response = await env.call(
        "POST",
        "/uploads",
        data={"workspace_id": env.workspace},
        files={"file": ("campaign.docx", output.getvalue(), "application/octet-stream")},
    )
    assert response.status_code == 201, response.text
    upload = response.json()
    assert upload["text"] == SAMPLE
    response = await env.call(
        "POST",
        "/submissions",
        json={
            "workspaceId": env.workspace,
            "title": "DOCX campaign",
            "channel": "Document",
            "content": upload["text"],
            "uploadId": upload["id"],
        },
    )
    assert response.status_code == 201, response.text
    sid = response.json()["id"]
    downloaded = await env.call("GET", f"/submissions/{sid}/file")
    assert downloaded.content == output.getvalue()
    analysed = await env.call("POST", f"/submissions/{sid}/analysis")
    assert next(c["status"] for c in analysed.json()["checks"] if c["check"] == "R6") == "checked"
    invalid = await env.call(
        "POST", "/uploads", data={"workspace_id": env.workspace}, files={"file": ("bad.pdf", b"invalid")}
    )
    assert invalid.status_code == 422
