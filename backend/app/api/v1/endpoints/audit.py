from fastapi import APIRouter, Depends, Query

from app.core.dependencies import current_user, database
from app.repositories.audit_repository import visible_audit
from app.utils.text_diff import public

router = APIRouter(tags=["Audit"])


@router.get("/audit")
async def list_events(
    workspace_id: str,
    limit: int = Query(1000, ge=1, le=5000),
    user=Depends(current_user),
    db=Depends(database),
):
    return public(await visible_audit(db, user, workspace_id, limit))
