from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from app.core.dependencies import current_user, database
from app.db.mongodb import transaction
from app.schemas.auth import Preferences, Profile
from app.services.audit_service import audit
from app.services.auth_service import user_view

router = APIRouter(prefix="/users/me", tags=["Profile"])


@router.patch("")
async def update(values: Profile, user=Depends(current_user), db=Depends(database)):
    changes = {"name": values.name, "email": str(values.email).lower()}
    try:
        async with transaction(db) as session:
            await db.users.update_one({"_id": user["_id"]}, {"$set": changes}, session=session)
            await audit(db, user, "Profile updated", session=session)
    except DuplicateKeyError:
        raise HTTPException(409, "Email is already registered")
    return user_view({**user, **changes})


@router.get("/preferences")
async def preferences(user=Depends(current_user)):
    return user.get("preferences", {"showActivity": True, "reviewsOnly": False})


@router.patch("/preferences")
async def update_preferences(values: Preferences, user=Depends(current_user), db=Depends(database)):
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"preferences": values.model_dump()}})
    return values
