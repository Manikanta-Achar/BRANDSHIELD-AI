from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import current_user, database
from app.core.permissions import membership
from app.db.mongodb import transaction
from app.schemas.auth import MemberUpdate, WorkspaceCreate, WorkspaceUpdate
from app.services.audit_service import audit
from app.services.auth_service import user_view
from app.utils.text_diff import oid, public, utcnow

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


async def workspace_view(db, workspace, session=None):
    members = await db.memberships.find({"workspaceId": str(workspace["_id"])}, session=session).to_list(None)
    users = await db.users.find(
        {"_id": {"$in": [oid(m["userId"]) for m in members]}}, session=session
    ).to_list(None)
    roles = {m["userId"]: m["role"] for m in members}
    return public({**workspace, "members": [{**user_view(u), "role": roles[str(u["_id"])]} for u in users]})


@router.get("")
async def list_workspaces(user=Depends(current_user), db=Depends(database)):
    assigned = await db.memberships.find({"userId": str(user["_id"])}).to_list(None)
    workspaces = await db.workspaces.find(
        {"_id": {"$in": [oid(m["workspaceId"]) for m in assigned]}}
    ).to_list(None)
    return [await workspace_view(db, w) for w in workspaces]


@router.post("", status_code=201)
async def create(values: WorkspaceCreate, user=Depends(current_user), db=Depends(database)):
    if user["role"] != "Admin":
        raise HTTPException(403, "Only a bootstrapped administrator can create workspaces")
    w = {
        "_id": ObjectId(),
        **values.model_dump(),
        "consent": False,
        "kbVersion": 0,
        "createdAt": utcnow(),
        "initials": "".join(n[0] for n in values.name.split()[:2]).upper(),
        "color": "#0d9488",
        "retention": "Retained until the workspace operator removes the database.",
    }
    async with transaction(db) as session:
        await db.workspaces.insert_one(w, session=session)
        await db.memberships.insert_one(
            {
                "workspaceId": str(w["_id"]),
                "userId": str(user["_id"]),
                "role": "Admin",
                "createdAt": utcnow(),
            },
            session=session,
        )
        await audit(db, user, "Workspace created", str(w["_id"]), session=session)
    return await workspace_view(db, w)


@router.get("/{workspace_id}")
async def get(workspace_id: str, user=Depends(current_user), db=Depends(database)):
    await membership(db, user, workspace_id)
    w = await db.workspaces.find_one({"_id": oid(workspace_id)})
    if not w:
        raise HTTPException(404, "Workspace not found")
    return await workspace_view(db, w)


@router.patch("/{workspace_id}")
async def update(
    workspace_id: str, values: WorkspaceUpdate, user=Depends(current_user), db=Depends(database)
):
    async with transaction(db) as session:
        await membership(db, user, workspace_id, {"Admin"}, session)
        await db.workspaces.update_one(
            {"_id": oid(workspace_id)},
            {"$set": {**values.model_dump(), "updatedAt": utcnow()}},
            session=session,
        )
        await audit(
            db,
            user,
            "Workspace settings updated",
            workspace_id,
            detail=f"External AI permission: {values.consent}",
            session=session,
        )
    return await get(workspace_id, user, db)


@router.put("/{workspace_id}/members")
async def set_member(
    workspace_id: str, values: MemberUpdate, user=Depends(current_user), db=Depends(database)
):
    async with transaction(db) as session:
        await membership(db, user, workspace_id, {"Admin"}, session)
        target = await db.users.find_one({"email": str(values.email).lower()}, session=session)
        if not target:
            raise HTTPException(404, "User must register before being assigned to a workspace")
        key = {"workspaceId": workspace_id, "userId": str(target["_id"])}
        existing = await db.memberships.find_one(key, session=session)
        if existing and existing["role"] == "Admin" and values.role != "Admin":
            if (
                await db.memberships.count_documents(
                    {"workspaceId": workspace_id, "role": "Admin"}, session=session
                )
                <= 1
            ):
                raise HTTPException(409, "Keep at least one workspace administrator")
        # Touch the workspace so simultaneous last-admin changes conflict transactionally.
        await db.workspaces.update_one(
            {"_id": oid(workspace_id)}, {"$inc": {"membershipRevision": 1}}, session=session
        )
        await db.memberships.update_one(
            key, {"$set": {"role": values.role, "updatedAt": utcnow()}}, upsert=True, session=session
        )
        await audit(
            db,
            user,
            "Workspace membership updated",
            workspace_id,
            detail=f"Assigned {target['name']} as {values.role}",
            session=session,
        )
    return await get(workspace_id, user, db)


@router.delete("/{workspace_id}/members/{user_id}", status_code=204)
async def remove_member(workspace_id: str, user_id: str, user=Depends(current_user), db=Depends(database)):
    oid(user_id)
    async with transaction(db) as session:
        await membership(db, user, workspace_id, {"Admin"}, session)
        target = await db.memberships.find_one(
            {"workspaceId": workspace_id, "userId": user_id}, session=session
        )
        if not target:
            raise HTTPException(404, "Membership not found")
        if (
            target["role"] == "Admin"
            and await db.memberships.count_documents(
                {"workspaceId": workspace_id, "role": "Admin"}, session=session
            )
            <= 1
        ):
            raise HTTPException(409, "Keep at least one workspace administrator")
        await db.workspaces.update_one(
            {"_id": oid(workspace_id)}, {"$inc": {"membershipRevision": 1}}, session=session
        )
        await db.memberships.delete_one({"_id": target["_id"]}, session=session)
        await audit(db, user, "Workspace membership removed", workspace_id, detail=user_id, session=session)
