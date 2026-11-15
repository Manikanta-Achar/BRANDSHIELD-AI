from bson import ObjectId
from fastapi import HTTPException

from app.core.permissions import membership
from app.db.mongodb import transaction
from app.services.audit_service import audit
from app.utils.text_diff import oid, public, utcnow


async def save_knowledge(db, user, values, item_id=None):
    changes = values.model_dump(mode="json", exclude={"expectedRevision"})
    async with transaction(db) as session:
        await membership(db, user, values.workspaceId, {"Admin"}, session)
        now = utcnow()
        if item_id:
            old = await db.knowledge_items.find_one({"_id": oid(item_id)}, session=session)
            if not old:
                raise HTTPException(404, "Knowledge item not found")
            if old["workspaceId"] != values.workspaceId:
                raise HTTPException(403, "Knowledge cannot be moved between workspaces")
            if old["revision"] != values.expectedRevision:
                raise HTTPException(409, "Knowledge changed. Reload before editing.")
            changes.update({"revision": old["revision"] + 1, "updatedAt": now, "updatedBy": str(user["_id"])})
            await db.knowledge_items.update_one(
                {"_id": old["_id"], "revision": old["revision"]}, {"$set": changes}, session=session
            )
            record = {**old, **changes}
        else:
            record = {
                "_id": ObjectId(),
                **changes,
                "revision": 1,
                "createdBy": str(user["_id"]),
                "createdAt": now,
                "updatedAt": now,
            }
            await db.knowledge_items.insert_one(record, session=session)
        snapshot = {**record, "itemId": str(record["_id"])}
        snapshot.pop("_id")
        await db.knowledge_versions.insert_one(snapshot, session=session)
        await db.workspaces.update_one(
            {"_id": oid(values.workspaceId)}, {"$inc": {"kbVersion": 1}}, session=session
        )
        await audit(
            db,
            user,
            "Knowledge item updated" if item_id else "Knowledge item created",
            values.workspaceId,
            detail=f"{record['title']} v{record['version']} (revision {record['revision']})",
            knowledgeItemId=str(record["_id"]),
            sourceVersion=record["version"],
            session=session,
        )
    return public(record)
