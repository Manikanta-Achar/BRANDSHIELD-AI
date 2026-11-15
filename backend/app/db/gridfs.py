from fastapi import HTTPException
from gridfs import AsyncGridFSBucket

from app.utils.text_diff import oid


def bucket(db):
    return AsyncGridFSBucket(db, bucket_name="uploads")


async def upload_record(db, upload_id, user, workspace_id):
    record = await db["uploads.files"].find_one({"_id": oid(upload_id)})
    if not record:
        raise HTTPException(404, "Uploaded file not found")
    meta = record["metadata"]
    if meta["ownerId"] != str(user["_id"]) or meta["workspaceId"] != workspace_id:
        raise HTTPException(403, "Uploaded file does not belong to this user and workspace")
    return record
