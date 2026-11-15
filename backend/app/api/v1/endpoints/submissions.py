from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.core.dependencies import current_user, database
from app.core.permissions import CREATORS, REVIEWERS, membership, submission_access
from app.db.gridfs import bucket, upload_record
from app.db.mongodb import transaction
from app.models.submission import MUTABLE
from app.repositories.submission_repository import hydrate
from app.schemas.submission import Revision, SubmissionCreate
from app.services.audit_service import audit
from app.services.extraction.text_extractor import extract
from app.services.workflow_service import ensure_version
from app.utils.text_diff import oid, utcnow

router = APIRouter(prefix="/submissions", tags=["Submissions"])


@router.get("")
async def list_submissions(workspace_id: str, user=Depends(current_user), db=Depends(database)):
    member = await membership(db, user, workspace_id)
    query = {"workspaceId": workspace_id}
    if member["role"] not in REVIEWERS:
        query["ownerId"] = str(user["_id"])
    return [
        await hydrate(db, s) for s in await db.submissions.find(query).sort("updatedAt", -1).to_list(None)
    ]


@router.get("/{submission_id}")
async def get(submission_id: str, user=Depends(current_user), db=Depends(database)):
    s, _ = await submission_access(db, user, submission_id)
    return await hydrate(db, s)


@router.post("", status_code=201)
async def create(values: SubmissionCreate, user=Depends(current_user), db=Depends(database)):
    extract(values.content)
    member = await membership(db, user, values.workspaceId, CREATORS)
    metadata, warnings, file = {}, [], None
    if values.uploadId:
        record = await upload_record(db, values.uploadId, user, values.workspaceId)
        extraction = record["metadata"]["extraction"]
        file = {
            "id": values.uploadId,
            "name": record["filename"],
            "size": record["length"],
            "extracted": True,
        }
        if values.content == extraction["text"]:
            metadata = extraction["metadata"]
        else:
            warnings.append(
                "Pasted text differs from the original document; document formatting was not checked for this content."
            )
        warnings.extend(extraction["warnings"])
    now, sid, vid = utcnow(), ObjectId(), ObjectId()
    s = {
        "_id": sid,
        "workspaceId": values.workspaceId,
        "ownerId": str(user["_id"]),
        "ownerName": user["name"],
        "title": values.title,
        "channel": values.channel,
        "contentType": values.contentType,
        "content": values.content,
        "revisedContent": values.content,
        "analysedContent": None,
        "state": "draft",
        "createdAt": now,
        "updatedAt": now,
        "currentVersionId": str(vid),
        "versionNumber": 1,
        "revision": 1,
        "kbVersion": "Not analysed",
        "checks": [],
        "warnings": warnings,
        "format": record["metadata"]["format"] if file else "Text",
        "file": file,
    }
    version = {
        "_id": vid,
        "workspaceId": values.workspaceId,
        "submissionId": str(sid),
        "number": 1,
        "content": values.content,
        "author": user["name"],
        "authorId": str(user["_id"]),
        "date": now,
        "state": "draft",
        "kbVersion": "Not analysed",
        "metadata": metadata,
        "warnings": warnings,
    }
    async with transaction(db) as session:
        await membership(db, user, values.workspaceId, CREATORS, session)
        await db.submissions.insert_one(s, session=session)
        await db.content_versions.insert_one(version, session=session)
        await audit(
            db, user, "Submission created", submission=s, new="draft", role=member["role"], session=session
        )
    return {"id": str(sid), "submission": await hydrate(db, s)}


@router.get("/{submission_id}/versions")
async def versions(submission_id: str, user=Depends(current_user), db=Depends(database)):
    return (await get(submission_id, user, db))["versions"]


@router.post("/{submission_id}/versions", status_code=201)
async def revise(submission_id: str, values: Revision, user=Depends(current_user), db=Depends(database)):
    extract(values.content)
    async with transaction(db) as session:
        s, member = await submission_access(db, user, submission_id, owner=True, session=session)
        ensure_version(s, values.expectedVersionId)
        if s["state"] not in MUTABLE:
            raise HTTPException(409, "Content cannot be edited during or after approval")
        current = await db.content_versions.find_one({"_id": oid(s["currentVersionId"])}, session=session)
        if values.content == current["content"]:
            raise HTTPException(409, "Make a change before saving a new version")
        vid, now = ObjectId(), utcnow()
        version = {
            "_id": vid,
            "workspaceId": s["workspaceId"],
            "submissionId": submission_id,
            "number": s["versionNumber"] + 1,
            "content": values.content,
            "author": user["name"],
            "authorId": str(user["_id"]),
            "date": now,
            "state": "draft",
            "kbVersion": "Not analysed",
            "metadata": {},
            "warnings": ["Text revision: original document formatting was not rechecked."]
            if s.get("file")
            else [],
        }
        old = s["state"]
        s.update(
            {
                "state": "draft",
                "currentVersionId": str(vid),
                "versionNumber": version["number"],
                "revisedContent": values.content,
                "analysedContent": None,
                "updatedAt": now,
                "checks": [],
                "warnings": version["warnings"],
                "reviewRequestId": None,
                "kbVersion": "Not analysed",
            }
        )
        await db.content_versions.insert_one(version, session=session)
        await db.submissions.update_one(
            {"_id": s["_id"]},
            {"$set": {k: v for k, v in s.items() if k not in {"_id", "revision"}}, "$inc": {"revision": 1}},
            session=session,
        )
        await audit(
            db,
            user,
            "Content revised",
            submission=s,
            previous=old,
            new="draft",
            role=member["role"],
            session=session,
        )
    return await hydrate(db, s)


@router.get("/{submission_id}/file")
async def download(submission_id: str, user=Depends(current_user), db=Depends(database)):
    s, _ = await submission_access(db, user, submission_id)
    if not s.get("file"):
        raise HTTPException(404, "No original file attached")
    stream = await bucket(db).open_download_stream(oid(s["file"]["id"]))
    data = await stream.read()
    return Response(
        data,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{s["file"]["name"]}"',
            "X-Content-Type-Options": "nosniff",
        },
    )
