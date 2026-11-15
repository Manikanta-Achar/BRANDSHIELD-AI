from fastapi import APIRouter, Depends, Request

from app.core.dependencies import current_user, database
from app.core.permissions import submission_access
from app.repositories.submission_repository import hydrate
from app.services.analysis.pipeline import analyse

router = APIRouter(tags=["Analysis"])


@router.post("/submissions/{submission_id}/analysis")
async def start(submission_id: str, request: Request, user=Depends(current_user), db=Depends(database)):
    s = await analyse(
        db, user, submission_id, request.app.state.settings, getattr(request.app.state, "ai_provider", None)
    )
    return await hydrate(db, s)


@router.get("/submissions/{submission_id}/analysis")
async def get(submission_id: str, user=Depends(current_user), db=Depends(database)):
    s, _ = await submission_access(db, user, submission_id)
    return await hydrate(db, s)
