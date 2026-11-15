from app.models.submission import LABELS
from app.utils.text_diff import public


async def hydrate(db, submission, session=None):
    sid = str(submission["_id"])
    versions = (
        await db.content_versions.find({"submissionId": sid}, session=session).sort("number", 1).to_list(None)
    )
    all_findings = await db.findings.find({"submissionId": sid}, session=session).to_list(None)
    reviews = await db.reviews.find({"submissionId": sid}, session=session).sort("date", 1).to_list(None)
    for v in versions:
        v["findings"] = [f for f in all_findings if f["contentVersionId"] == str(v["_id"])]
        v["status"] = LABELS[v["state"]]
    current = next(v for v in versions if str(v["_id"]) == submission["currentVersionId"])
    return public(
        {
            **submission,
            "status": LABELS[submission["state"]],
            "versions": versions,
            "findings": current["findings"],
            "comments": [r for r in reviews if r["kind"] == "comment"],
            "decisions": [r for r in reviews if r["kind"] == "decision"],
        }
    )
