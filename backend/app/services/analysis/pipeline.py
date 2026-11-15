import asyncio

from bson import ObjectId
from fastapi import HTTPException

from app.core.permissions import submission_access
from app.db.mongodb import transaction
from app.models.submission import MUTABLE
from app.services.ai import claim_checker, tone_checker
from app.services.ai.llm_client import ConsentClient, GeminiClient
from app.services.audit_service import audit
from app.services.rules.rule_engine import approved, run_rules
from app.services.workflow_service import transition
from app.utils.text_diff import oid, utcnow


async def analyse(db, user, submission_id, settings, provider=None):
    async with transaction(db) as session:
        s, member = await submission_access(db, user, submission_id, owner=True, session=session)
        if s["state"] not in MUTABLE:
            raise HTTPException(409, "This submission cannot be analysed in its current state")
        version = await db.content_versions.find_one({"_id": oid(s["currentVersionId"])}, session=session)
        if s["revisedContent"] != version["content"]:
            raise HTTPException(409, "Save the working revision as a new version before analysis")
        if version.get("analysedAt"):
            # Keep the previous report when checking against current knowledge again.
            previous_state = s["state"]
            version = {
                "_id": ObjectId(),
                "workspaceId": s["workspaceId"],
                "submissionId": submission_id,
                "number": s["versionNumber"] + 1,
                "content": version["content"],
                "metadata": version.get("metadata", {}),
                "warnings": version.get("warnings", []),
                "author": user["name"],
                "authorId": str(user["_id"]),
                "date": utcnow(),
                "state": "draft",
                "kbVersion": "Not analysed",
            }
            await db.content_versions.insert_one(version, session=session)
            changes = {
                "currentVersionId": str(version["_id"]),
                "versionNumber": version["number"],
                "state": "draft",
                "analysedContent": None,
                "reviewRequestId": None,
            }
            await db.submissions.update_one({"_id": s["_id"]}, {"$set": changes}, session=session)
            s.update(changes)
            await audit(
                db,
                user,
                "Analysis revision created",
                submission=s,
                previous=previous_state,
                new="draft",
                role=member["role"],
                session=session,
            )
        items = approved(
            await db.knowledge_items.find({"workspaceId": s["workspaceId"]}, session=session).to_list(None),
            s["workspaceId"],
        )
        workspace = await db.workspaces.find_one({"_id": oid(s["workspaceId"])}, session=session)
        kb_version = f"Knowledge snapshot {workspace['kbVersion']}" + (
            " (no effective approved sources)" if not items else ""
        )
        if s["state"] != "submitted":
            old = await transition(db, s, "submitted", session)
            await audit(
                db,
                user,
                "Content submitted",
                submission=s,
                previous=old,
                new="submitted",
                role=member["role"],
                session=session,
            )
        old = await transition(db, s, "analysing", session, {"analysisStartedAt": utcnow()})
        await audit(
            db,
            user,
            "Analysis started",
            submission=s,
            previous=old,
            new="analysing",
            role=member["role"],
            session=session,
        )
    try:
        report = run_rules(version["content"], items, s["workspaceId"], s["channel"], version.get("metadata"))
        report["warnings"].extend(version.get("warnings", []))
        if not items:
            report["warnings"].append(
                "No current approved knowledge. Workspace-specific compliance cannot be verified."
            )
        client = provider or GeminiClient(settings)
        ai_status = "skipped"
        disclosure = {
            "workspaceId": s["workspaceId"],
            "contentVersionId": s["currentVersionId"],
            "actorId": str(user["_id"]),
            "provider": "Gemini",
            "model": settings.gemini_model,
            "date": utcnow(),
            "consent": workspace["consent"],
            "externalProcessing": False,
        }
        if not workspace["consent"]:
            report["warnings"].append("AI skipped: workspace permission is disabled.")
        elif not client.configured:
            ai_status = "unavailable"
            report["warnings"].append(
                "AI unavailable: configure GEMINI_API_KEY and GEMINI_MODEL. Deterministic checks were retained."
            )
        else:
            ai_status = "complete"
            client = ConsentClient(client, db, workspace["_id"], disclosure)
            for rule, execute in [
                ("A1", lambda: claim_checker.check(client, version["content"], items, s["workspaceId"])),
                ("A2", lambda: tone_checker.check(client, version["content"], items)),
            ]:
                # Consent is rechecked before each external processing stage.
                current_workspace = await db.workspaces.find_one({"_id": workspace["_id"]})
                if not current_workspace["consent"]:
                    ai_status = "partial"
                    report["checks"].append(
                        {"check": rule, "status": "skipped", "reason": "Workspace consent revoked."}
                    )
                    continue
                try:
                    findings, warnings = await asyncio.wait_for(
                        execute(), timeout=settings.ai_timeout_seconds + 1
                    )
                    report["findings"].extend(findings)
                    report["warnings"].extend(warnings)
                    if warnings:
                        ai_status = "partial"
                    report["checks"].append({"check": rule, "status": "partial" if warnings else "checked"})
                except Exception:
                    ai_status = "partial"
                    report["checks"].append(
                        {
                            "check": rule,
                            "status": "unavailable",
                            "reason": "Provider timeout, failure or invalid response.",
                        }
                    )
                    report["warnings"].append(
                        f"{rule} unavailable: provider failure or invalid response. Deterministic findings were retained."
                    )
        for rule in ("A1", "A2"):
            if not any(c["check"] == rule for c in report["checks"]):
                report["checks"].append(
                    {"check": rule, "status": ai_status, "reason": report["warnings"][-1]}
                )
        disclosure["status"] = ai_status
        async with transaction(db) as session:
            current = await db.submissions.find_one({"_id": s["_id"]}, session=session)
            if current["state"] != "analysing" or current["currentVersionId"] != s["currentVersionId"]:
                raise HTTPException(409, "Content changed during analysis")
            for f in report["findings"]:
                f.update(
                    {
                        "workspaceId": s["workspaceId"],
                        "submissionId": submission_id,
                        "contentVersionId": s["currentVersionId"],
                        "createdAt": utcnow(),
                    }
                )
            if report["findings"]:
                await db.findings.insert_many(report["findings"], session=session)
            state = (
                "needs_revision"
                if report["findings"] or any(c["status"] == "failed" for c in report["checks"])
                else "submitted"
            )
            updates = {
                "analysedContent": version["content"],
                "kbVersion": kb_version,
                "checks": report["checks"],
                "warnings": report["warnings"],
                "aiStatus": ai_status,
                "analysedAt": utcnow(),
            }
            await transition(db, current, state, session, updates)
            await db.content_versions.update_one(
                {"_id": version["_id"]},
                {"$set": {**updates, "state": state, "knowledgeSnapshot": items}},
                session=session,
            )
            await db.ai_disclosures.insert_one(disclosure, session=session)
            await audit(
                db,
                user,
                "Analysis completed",
                submission=current,
                previous="analysing",
                new=state,
                detail=f"{len(report['findings'])} findings; AI {ai_status}",
                role=member["role"],
                session=session,
            )
        return current
    except BaseException:
        # A failed/crashed request must not strand content permanently in analysing.
        await db.submissions.update_one(
            {"_id": s["_id"], "state": "analysing"},
            {"$set": {"state": "draft", "warnings": ["Analysis did not complete. Retry analysis."]}},
        )
        raise
