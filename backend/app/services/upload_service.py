from anyio import to_thread
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.core.dependencies import current_user, database
from app.core.permissions import CREATORS, membership
from app.db.gridfs import bucket
from app.services.audit_service import audit
from app.services.extraction import docx_extractor, pdf_extractor
from app.utils.file_validation import validate_file
from app.utils.text_diff import utcnow

router = APIRouter(tags=["Uploads"])


@router.post("/uploads", status_code=201)
async def upload(
    request: Request,
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    user=Depends(current_user),
    db=Depends(database),
):
    member = await membership(db, user, workspace_id, CREATORS)
    limit = request.app.state.settings.max_upload_bytes
    try:
        data = await file.read(limit + 1)
    finally:
        await file.close()
    if not data or len(data) > limit:
        raise HTTPException(413, "Choose a non-empty PDF or DOCX up to 10 MB")
    name, kind = validate_file(file.filename or "", data)
    extractor = pdf_extractor.extract if kind == "PDF" else docx_extractor.extract
    result = await to_thread.run_sync(extractor, data)
    file_id = await bucket(db).upload_from_stream(
        name,
        data,
        metadata={
            "ownerId": str(user["_id"]),
            "workspaceId": workspace_id,
            "format": kind,
            "extraction": result,
            "createdAt": utcnow(),
        },
    )
    await audit(
        db,
        user,
        "Content extracted",
        workspace_id,
        detail=f"{kind} extraction completed",
        role=member["role"],
        uploadId=str(file_id),
    )
    return {"id": str(file_id), "name": name, "format": kind, "size": len(data), **result}
