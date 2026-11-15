from fastapi import HTTPException

from app.utils.text_diff import oid

ROLES = ("Admin", "Content Creator", "Reviewer", "Agency Partner")
CREATORS = {"Admin", "Content Creator", "Agency Partner"}
REVIEWERS = {"Admin", "Reviewer"}


async def membership(db, user, workspace_id, roles=None, session=None):
    oid(workspace_id)
    record = await db.memberships.find_one(
        {"workspaceId": workspace_id, "userId": str(user["_id"])}, session=session
    )
    if not record or (roles and record["role"] not in roles):
        raise HTTPException(403, "You do not have permission in this workspace")
    return record


async def submission_access(db, user, submission_id, owner=False, session=None):
    submission = await db.submissions.find_one({"_id": oid(submission_id)}, session=session)
    if not submission:
        raise HTTPException(404, "Submission not found")
    member = await membership(db, user, submission["workspaceId"], session=session)
    own = submission["ownerId"] == str(user["_id"])
    if (owner and (not own or member["role"] not in CREATORS)) or (
        not own and member["role"] not in REVIEWERS
    ):
        raise HTTPException(403, "You do not have permission to access this submission")
    return submission, member
