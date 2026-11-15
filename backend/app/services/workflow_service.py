from fastapi import HTTPException

from app.models.submission import TRANSITIONS
from app.utils.text_diff import utcnow


def ensure_version(submission, expected):
    if submission["currentVersionId"] != expected:
        raise HTTPException(409, "Content changed. Reload before continuing.")


async def transition(db, submission, new, session, changes=None):
    old = submission["state"]
    if new not in TRANSITIONS[old]:
        raise HTTPException(409, f"Invalid transition from {old} to {new}")
    updates = {"state": new, "updatedAt": utcnow(), **(changes or {})}
    result = await db.submissions.update_one(
        {"_id": submission["_id"], "state": old, "currentVersionId": submission["currentVersionId"]},
        {"$set": updates, "$inc": {"revision": 1}},
        session=session,
    )
    if result.modified_count != 1:
        raise HTTPException(409, "Submission changed. Reload before continuing.")
    submission.update(updates)
    return old
