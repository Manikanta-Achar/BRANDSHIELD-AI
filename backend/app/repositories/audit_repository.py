from app.core.permissions import REVIEWERS, membership


async def visible_audit(db, user, workspace_id, limit=1000):
    member = await membership(db, user, workspace_id)
    query = {"workspaceId": workspace_id}
    if member["role"] not in REVIEWERS:
        owned = await db.submissions.find(
            {"workspaceId": workspace_id, "ownerId": str(user["_id"])}, {"_id": 1}
        ).to_list(None)
        query["submissionId"] = {"$in": [str(s["_id"]) for s in owned]}
    return await db.audit_events.find(query).sort("date", -1).limit(limit).to_list(None)
