from fastapi import APIRouter

from app.api.v1.endpoints import (
    analysis,
    analytics,
    audit,
    auth,
    findings,
    knowledge,
    reviews,
    submissions,
    users,
    workspaces,
)
from app.services.upload_service import router as uploads

router = APIRouter(prefix="/api/v1")
for module in (
    auth,
    workspaces,
    users,
    knowledge,
    submissions,
    analysis,
    findings,
    reviews,
    audit,
    analytics,
):
    router.include_router(module.router)
router.include_router(uploads)
