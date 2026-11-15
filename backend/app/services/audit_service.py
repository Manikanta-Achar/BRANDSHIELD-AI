from app.utils.text_diff import utcnow


async def audit(
    db,
    user,
    action,
    workspace_id=None,
    submission=None,
    detail="",
    previous=None,
    new=None,
    role=None,
    session=None,
    **references,
):
    record = {
        "workspaceId": workspace_id or (submission or {}).get("workspaceId"),
        "actorId": str(user["_id"]),
        "actor": user["name"],
        "role": role or user["role"],
        "action": action,
        "detail": detail,
        "date": utcnow(),
        "submissionId": str(submission["_id"]) if submission else None,
        "contentVersionId": (submission or {}).get("currentVersionId"),
        "version": (submission or {}).get("versionNumber"),
        "kbVersion": (submission or {}).get("kbVersion"),
        "previousState": previous,
        "newState": new,
        **references,
    }
    await db.audit_events.insert_one(record, session=session)
    return record
