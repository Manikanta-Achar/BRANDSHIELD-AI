from app.services.ai.response_validator import validate_assessment
from app.services.analysis.evidence import evidence, finding


async def check(client, text, items):
    passages = [evidence(k) for k in items if k["type"] == "Brand Guidelines"][:4]
    if not passages:
        return [], ["A2 skipped: no approved brand tone guidelines."]
    excerpt = text[:10000]
    raw = await client.assess(
        "Compare tone with the approved guidelines. Conflicts means a potential tone inconsistency; "
        "Supported means consistent tone; Unverified means insufficient guidance.",
        excerpt,
        passages,
    )
    assessment, source, warning = validate_assessment(raw, passages, excerpt)
    warnings = [warning] if warning else []
    if len(text) > len(excerpt):
        warnings.append("A2 assessed the first 10,000 characters only.")
    if assessment.verdict == "Conflicts":
        return [
            finding(
                "A2",
                "Potential brand tone inconsistency",
                "Medium",
                assessment.original,
                assessment.explanation,
                source,
                assessment.correction,
                "Brand tone",
                confidence=assessment.confidence,
            )
        ], warnings
    return [], warnings
