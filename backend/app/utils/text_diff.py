from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException


def utcnow():
    return datetime.now(timezone.utc)


def oid(value: str):
    if not ObjectId.is_valid(value):
        raise HTTPException(422, "Invalid resource ID")
    return ObjectId(value)


def public(value):
    """Convert BSON at the API boundary; never expose internal authentication fields."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [public(v) for v in value]
    if isinstance(value, dict):
        return {
            ("id" if k == "_id" else k): public(v)
            for k, v in value.items()
            if k not in {"password_hash", "token_version"}
        }
    return value
