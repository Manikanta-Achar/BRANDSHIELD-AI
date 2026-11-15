from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import current_user, database
from app.core.permissions import REVIEWERS, membership, submission_access
from app.db.mongodb import transaction
from app.repositories.submission_repository import hydrate
from app.schemas.review import Comment, Decision
from app.schemas.submission import VersionReference
from app.services.audit_service import audit
from app.services.workflow_service import ensure_version, transition
from app.utils.text_diff import oid, public, utcnow

router = APIRouter(tags=["Human review"])


@router.get("/reviews")
async def queue(workspace_id: str, user=Depends(current_user), db=Depends(database)):
    await membership(db, user, workspace_id, REVIEWERS)
    submissions = (
        await db.submissions.find(
            {"workspaceId": workspace_id, "state": "in_review", "ownerId": {"$ne": str(user["_id"])}}
        )
        .sort("updatedAt", 1)
        .to_list(None)
    )
    return [await hydrate(db, s) for s in submissions]


@router.post("/submissions/{submission_id}/review")
async def request_review(
    submission_id: str, values: VersionReference, user=Depends(current_user), db=Depends(database)
):
    async with transaction(db) as session:
        s, member = await submission_access(db, user, submission_id, owner=True, session=session)
        ensure_version(s, values.expectedVersionId)
        version = await db.content_versions.find_one({"_id": oid(s["currentVersionId"])}, session=session)
        if s["state"] not in {"submitted", "needs_revision"} or not version.get("analysedAt"):
            raise HTTPException(409, "Run analysis before requesting review")
        if s["revisedContent"] != version["content"] or s["analysedContent"] != version["content"]:
            raise HTTPException(409, "Save and analyse the revised content first")
        if await db.findings.count_documents(
            {"contentVersionId": s["currentVersionId"], "resolution": "Open"}, session=session
        ):
            raise HTTPException(409, "Resolve or challenge every finding before requesting review")
        request_id = str(ObjectId())
        old = await transition(
            db,
            s,
            "in_review",
            session,
            {"reviewRequestId": request_id, "reviewVersionId": s["currentVersionId"]},
        )
        await db.content_versions.update_one(
            {"_id": version["_id"]}, {"$set": {"state": "in_review"}}, session=session
        )
        await db.reviews.insert_one(
            {
                "kind": "request",
                "workspaceId": s["workspaceId"],
                "submissionId": submission_id,
                "contentVersionId": s["currentVersionId"],
                "reviewRequestId": request_id,
                "actorId": str(user["_id"]),
                "kbVersion": s["kbVersion"],
                "date": utcnow(),
            },
            session=session,
        )
        await audit(
            db,
            user,
            "Review requested",
            submission=s,
            previous=old,
            new="in_review",
            role=member["role"],
            session=session,
        )
    return await hydrate(db, s)


@router.post("/reviews/{submission_id}/comments", status_code=201)
async def comment(submission_id: str, values: Comment, user=Depends(current_user), db=Depends(database)):
    async with transaction(db) as session:
        s, member = await submission_access(db, user, submission_id, session=session)
        if member["role"] not in REVIEWERS:
            raise HTTPException(403, "Only workspace reviewers can add review comments")
        if s["state"] != "in_review":
            raise HTTPException(409, "Comments require an active review")
        record = {
            "kind": "comment",
            "workspaceId": s["workspaceId"],
            "submissionId": submission_id,
            "contentVersionId": s["currentVersionId"],
            "reviewRequestId": s["reviewRequestId"],
            "text": values.comment,
            "author": user["name"],
            "authorId": str(user["_id"]),
            "role": member["role"],
            "date": utcnow(),
        }
        # Serialize against concurrent decisions/revisions.
        await db.submissions.update_one({"_id": s["_id"]}, {"$inc": {"revision": 1}}, session=session)
        await db.reviews.insert_one(record, session=session)
        await audit(
            db,
            user,
            "Review comment added",
            submission=s,
            detail=values.comment,
            role=member["role"],
            session=session,
        )
    return public(record)


@router.post("/reviews/{submission_id}/decision")
async def decide(submission_id: str, values: Decision, user=Depends(current_user), db=Depends(database)):
    async with transaction(db) as session:
        s, member = await submission_access(db, user, submission_id, session=session)
        if member["role"] not in REVIEWERS or s["ownerId"] == str(user["_id"]):
            raise HTTPException(403, "A different authorized human reviewer must decide")
        ensure_version(s, values.expectedVersionId)
        if s["state"] != "in_review" or s.get("reviewRequestId") != values.reviewRequestId:
            raise HTTPException(409, "This review request is stale. Reload the current content.")
        findings = await db.findings.find(
            {"contentVersionId": s["currentVersionId"]}, session=session
        ).to_list(None)
        attention = any(
            f["severity"] == "High"
            or f["resolution"] == "Challenged"
            or f.get("evidenceStatus") == "Unverified"
            for f in findings
        )
        if attention and not values.acknowledged:
            raise HTTPException(422, "Explicitly acknowledge high-severity, challenged or uncertain findings")
        state = {"Approved": "approved", "Rejected": "rejected", "Needs Revision": "needs_revision"}[
            values.decision
        ]
        old = await transition(db, s, state, session)
        record = {
            "kind": "decision",
            "workspaceId": s["workspaceId"],
            "submissionId": submission_id,
            "contentVersionId": s["currentVersionId"],
            "reviewRequestId": s["reviewRequestId"],
            "decision": values.decision,
            "actor": user["name"],
            "actorId": str(user["_id"]),
            "role": member["role"],
            "date": utcnow(),
            "version": s["versionNumber"],
            "comment": values.comment,
            "acknowledged": values.acknowledged,
            "kbVersion": s["kbVersion"],
        }
        await db.reviews.insert_one(record, session=session)
        await db.content_versions.update_one(
            {"_id": oid(s["currentVersionId"])}, {"$set": {"state": state}}, session=session
        )
        action = {
            "approved": "Content approved",
            "rejected": "Content rejected",
            "needs_revision": "Changes requested",
        }[state]
        await audit(
            db,
            user,
            action,
            submission=s,
            detail=values.comment,
            previous=old,
            new=state,
            reviewRequestId=s["reviewRequestId"],
            role=member["role"],
            session=session,
        )
    return await hydrate(db, s)
