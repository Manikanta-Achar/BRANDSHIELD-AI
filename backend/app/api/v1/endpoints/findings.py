from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import current_user, database
from app.core.permissions import submission_access
from app.db.mongodb import transaction
from app.models.submission import MUTABLE
from app.schemas.finding import FindingAction
from app.services.audit_service import audit
from app.services.rules.prohibited_words import literal
from app.services.workflow_service import ensure_version
from app.utils.text_diff import oid, public, utcnow

router = APIRouter(tags=["Findings"])


@router.patch("/submissions/{submission_id}/findings/{finding_id}")
async def resolve(
    submission_id: str,
    finding_id: str,
    values: FindingAction,
    user=Depends(current_user),
    db=Depends(database),
):
    async with transaction(db) as session:
        s, member = await submission_access(db, user, submission_id, owner=True, session=session)
        ensure_version(s, values.expectedVersionId)
        if s["state"] not in MUTABLE:
            raise HTTPException(409, "Findings cannot be changed during or after approval")
        f = await db.findings.find_one(
            {
                "_id": oid(finding_id),
                "submissionId": submission_id,
                "contentVersionId": s["currentVersionId"],
            },
            session=session,
        )
        if not f:
            raise HTTPException(404, "Finding not found on the current version")
        if f["resolution"] != "Open":
            raise HTTPException(409, "Finding already resolved. Reload the report.")
        changes = {
            "resolution": values.resolution,
            "reason": values.reason,
            "resolvedAt": utcnow(),
            "resolvedBy": str(user["_id"]),
        }
        if values.resolution in ("Accepted", "Edited"):
            correction = values.correction if values.resolution == "Edited" else f.get("correction", "")
            if not correction:
                raise HTTPException(
                    422, "No automatic correction available. Edit the draft manually or record a challenge."
                )
            if f["text"]:
                pattern = literal(f["text"])
                if not pattern.search(s["revisedContent"]):
                    raise HTTPException(409, "Flagged text changed. Save and recheck the revision.")
                s["revisedContent"] = pattern.sub(lambda m: correction, s["revisedContent"])
            elif f["check"] == "R2":
                s["revisedContent"] += "\n\n" + correction
            else:
                raise HTTPException(422, "This correction must be applied in the original document")
            if len(s["revisedContent"]) > 50000:
                raise HTTPException(422, "Corrected text exceeds 50,000 characters")
            changes["appliedCorrection"] = correction
        await db.findings.update_one({"_id": f["_id"]}, {"$set": changes}, session=session)
        await db.submissions.update_one(
            {"_id": s["_id"]},
            {"$set": {"revisedContent": s["revisedContent"], "updatedAt": utcnow()}, "$inc": {"revision": 1}},
            session=session,
        )
        await audit(
            db,
            user,
            "Finding " + values.resolution.lower(),
            submission=s,
            detail=values.reason or f["check"],
            findingId=finding_id,
            role=member["role"],
            session=session,
        )
    return public({**f, **changes})
