from datetime import timedelta

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import current_user, database
from app.core.permissions import REVIEWERS, membership
from app.models.submission import LABELS
from app.repositories.audit_repository import visible_audit
from app.utils.text_diff import public, utcnow

router = APIRouter(tags=["Analytics"])


@router.get("/dashboard")
async def dashboard(
    workspace_id: str,
    days: int | None = Query(None, ge=1, le=3650),
    user=Depends(current_user),
    db=Depends(database),
):
    member = await membership(db, user, workspace_id)
    query = {"workspaceId": workspace_id}
    if member["role"] not in REVIEWERS:
        query["ownerId"] = str(user["_id"])
    if days:
        query["createdAt"] = {"$gte": utcnow() - timedelta(days=days)}
    counts = await (
        await db.submissions.aggregate(
            [{"$match": query}, {"$group": {"_id": "$state", "count": {"$sum": 1}}}]
        )
    ).to_list(None)
    counts = {r["_id"]: r["count"] for r in counts}
    latest = await db.submissions.find(query, {"currentVersionId": 1}).to_list(None)
    finding_query = {
        "workspaceId": workspace_id,
        "contentVersionId": {"$in": [s["currentVersionId"] for s in latest]},
    }
    categories = await (
        await db.findings.aggregate(
            [{"$match": finding_query}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}]
        )
    ).to_list(None)
    high = await db.findings.count_documents(
        {**finding_query, "severity": "High", "resolution": {"$in": ["Open", "Dismissed", "Challenged"]}}
    )
    recent = (
        await db.submissions.find(query, {"title": 1, "state": 1, "updatedAt": 1})
        .sort("updatedAt", -1)
        .limit(5)
        .to_list(None)
    )
    activity = [
        a
        for a in await visible_audit(db, user, workspace_id, 100)
        if a["action"]
        in {
            "Review requested",
            "Content approved",
            "Content rejected",
            "Changes requested",
            "Review comment added",
        }
    ][:4]
    return public(
        {
            "totalSubmissions": sum(counts.values()),
            "pendingReviews": counts.get("in_review", 0),
            "approvedSubmissions": counts.get("approved", 0),
            "rejectedSubmissions": counts.get("rejected", 0),
            "highSeverityViolations": high,
            "byCategory": [{"name": r["_id"], "count": r["count"]} for r in categories],
            "byStatus": [{"name": LABELS[k], "value": v} for k, v in counts.items()],
            "recentSubmissions": recent,
            "recentReviewActivity": activity,
        }
    )
