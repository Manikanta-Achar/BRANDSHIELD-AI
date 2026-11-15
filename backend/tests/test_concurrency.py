import asyncio
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId


async def test_concurrent_decisions_commit_once(env):
    s = await env.reviewable()
    payload = {
        "expectedVersionId": s["currentVersionId"],
        "reviewRequestId": s["reviewRequestId"],
        "decision": "Approved",
        "comment": "Evidence reviewed by the assigned human reviewer.",
        "acknowledged": True,
    }
    responses = await asyncio.gather(
        *[env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=payload) for _ in range(2)]
    )
    assert sorted(r.status_code for r in responses) == [200, 409]
    assert await env.db.reviews.count_documents({"submissionId": s["id"], "kind": "decision"}) == 1
    assert (
        await env.db.audit_events.count_documents({"submissionId": s["id"], "action": "Content approved"})
        == 1
    )


async def test_decision_audit_failure_rolls_back(env, monkeypatch):
    from app.api.v1.endpoints import reviews

    s = await env.reviewable()
    monkeypatch.setattr(reviews, "audit", AsyncMock(side_effect=RuntimeError("Audit write failed")))
    payload = {
        "expectedVersionId": s["currentVersionId"],
        "reviewRequestId": s["reviewRequestId"],
        "decision": "Approved",
        "comment": "Evidence reviewed by an assigned human reviewer.",
        "acknowledged": True,
    }
    with pytest.raises(RuntimeError):
        await env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=payload)
    assert (await env.call("GET", f"/submissions/{s['id']}")).json()["status"] == "In Review"
    assert await env.db.reviews.count_documents({"submissionId": s["id"], "kind": "decision"}) == 0


async def test_reanalysis_retains_old_report_and_uses_current_knowledge(env):
    s = await env.submission()
    first = s["currentVersionId"]
    fact = next(f["evidence"] for f in s["findings"] if f["check"] == "R4")
    await env.db.knowledge_items.update_one(
        {"_id": ObjectId(fact["id"])}, {"$set": {"content": "Up to 20 hours", "approvedValue": 20}}
    )
    response = await env.call("POST", f"/submissions/{s['id']}/analysis")
    assert response.status_code == 200, response.text
    latest = response.json()
    assert latest["currentVersionId"] != first and len(latest["versions"]) == 2
    assert (
        next(f["evidence"] for f in latest["versions"][0]["findings"] if f["check"] == "R4")["content"]
        == "Up to 10 hours"
    )
    assert (
        next(f["evidence"] for f in latest["findings"] if f["check"] == "R4")["content"] == "Up to 20 hours"
    )


async def test_body_limits_and_exact_content(env):
    response = await env.call("POST", "/submissions", content=b"x" * (1024 * 1024 + 1))
    assert response.status_code == 413
    text = "  TechNova source whitespace.\n"
    s = await env.submission(text, analyse=False)
    assert s["content"] == text and s["versions"][0]["content"] == text
