import re

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import current_user, database
from app.core.permissions import membership
from app.schemas.knowledge import Knowledge, KnowledgeUpdate
from app.services.knowledge_service import save_knowledge
from app.utils.text_diff import oid, public

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


@router.get("")
async def list_items(
    workspace_id: str,
    category: str | None = None,
    q: str = Query("", max_length=200),
    user=Depends(current_user),
    db=Depends(database),
):
    await membership(db, user, workspace_id)
    query = {"workspaceId": workspace_id}
    if category:
        query["type"] = category
    if q:
        query["$or"] = [
            {k: {"$regex": re.escape(q), "$options": "i"}} for k in ("title", "content", "source")
        ]
    return public(await db.knowledge_items.find(query).sort("updatedAt", -1).to_list(None))


@router.post("", status_code=201)
async def create(values: Knowledge, user=Depends(current_user), db=Depends(database)):
    return await save_knowledge(db, user, values)


@router.get("/{item_id}")
async def get(item_id: str, user=Depends(current_user), db=Depends(database)):
    item = await db.knowledge_items.find_one({"_id": oid(item_id)})
    if not item:
        raise HTTPException(404, "Knowledge item not found")
    await membership(db, user, item["workspaceId"])
    return public(item)


@router.get("/{item_id}/versions")
async def versions(item_id: str, user=Depends(current_user), db=Depends(database)):
    await get(item_id, user, db)
    return public(await db.knowledge_versions.find({"itemId": item_id}).sort("revision", 1).to_list(None))


@router.patch("/{item_id}")
async def update(item_id: str, values: KnowledgeUpdate, user=Depends(current_user), db=Depends(database)):
    return await save_knowledge(db, user, values, item_id)


@router.post("/{item_id}/archive")
async def archive(item_id: str, user=Depends(current_user), db=Depends(database)):
    item = await get(item_id, user, db)
    values = {k: v for k, v in item.items() if k in Knowledge.model_fields}
    values.update(status="Archived", expectedRevision=item["revision"])
    return await save_knowledge(db, user, KnowledgeUpdate(**values), item_id)
