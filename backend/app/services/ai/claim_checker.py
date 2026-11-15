import re

from app.services.ai.response_validator import validate_assessment
from app.services.analysis.evidence import finding
from app.services.retrieval.keyword_retriever import retrieve


def candidates(text):
    return [
        s.strip()[:1500]
        for s in re.split(r"(?<=[.!?])\s+|\n+", text)
        if re.search(r"\d|\bbest\b|\bguarantee|\bperformance\b|\bbetter\b|\balways\b", s, re.I)
    ][:5]


async def check(client, text, items, workspace_id):
    findings, warnings = [], []
    for claim in candidates(text):
        passages = retrieve(claim, items, workspace_id)
        if not passages:
            findings.append(
                finding(
                    "A1",
                    "Promotional claim is Unverified",
                    "Medium",
                    claim,
                    "No relevant approved evidence was retrieved. Human verification is required.",
                    category="Unsupported claim",
                    confidence="No sufficient approved evidence",
                )
            )
            continue
        raw = await client.assess(
            "Verify this promotional claim: Supported, Conflicts or Unverified.", claim, passages
        )
        assessment, source, warning = validate_assessment(raw, passages, claim)
        if warning:
            warnings.append(warning)
        if assessment.verdict != "Supported":
            findings.append(
                finding(
                    "A1",
                    "Claim " + assessment.verdict.lower(),
                    "High" if assessment.verdict == "Conflicts" else "Medium",
                    assessment.original,
                    assessment.explanation,
                    source,
                    assessment.correction,
                    "Unsupported claim",
                    confidence=assessment.confidence,
                    verdict=assessment.verdict,
                )
            )
    return findings, warnings
