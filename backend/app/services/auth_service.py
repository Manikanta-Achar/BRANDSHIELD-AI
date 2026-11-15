from datetime import timedelta

from fastapi import HTTPException
from pymongo import ReturnDocument

from app.core.security import issue_token
from app.utils.text_diff import utcnow


def user_view(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "initials": "".join(n[0] for n in user["name"].split()[:2]).upper(),
    }


def authentication(user, settings):
    return {"access_token": issue_token(user, settings), "token_type": "bearer", "user": user_view(user)}


async def throttle(db, key, limit):
    now = utcnow()
    await db.auth_attempts.delete_one({"key": key, "expiresAt": {"$lte": now}})
    record = await db.auth_attempts.find_one_and_update(
        {"key": key},
        {"$inc": {"count": 1}, "$setOnInsert": {"expiresAt": now + timedelta(minutes=15)}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if record["count"] > limit:
        raise HTTPException(429, "Too many authentication attempts. Try again in 15 minutes.")
