from datetime import datetime, timezone

from app.services.rules import (
    absolute_claims,
    alt_text,
    color_contrast,
    disclaimers,
    numeric_conflicts,
    prohibited_words,
    terminology,
)


def approved(items, workspace_id, as_of=None):
    today = as_of or datetime.now(timezone.utc).date().isoformat()
    return [
        i
        for i in items
        if i["workspaceId"] == workspace_id and i["status"] == "Active" and i["effective"] <= today
    ]


def run_rules(text, items, workspace_id, channel="Advertisement", metadata=None):
    items = approved(items, workspace_id)
    findings, checks, warnings = [], [], []
    rules = [
        ("R1", lambda: prohibited_words.check(text, items)),
        ("R2", lambda: disclaimers.check(text, items, channel)),
        ("R3", lambda: terminology.check(text, items)),
        ("R4", lambda: numeric_conflicts.check(text, items)),
        ("R5", lambda: absolute_claims.check(text, items, findings)),
    ]
    for rule, execute in rules:
        try:
            findings.extend(execute())
            categories = {
                "R1": "Prohibited Words",
                "R2": "Required Disclaimers",
                "R3": "Terminology",
                "R4": "Approved Facts",
                "R5": "Brand Guidelines",
            }
            configured = any(
                i["type"] == categories[rule] and (rule != "R5" or i.get("rule") == "absolute") for i in items
            )
            checks.append(
                {
                    "check": rule,
                    "status": "checked" if configured else "not_checked",
                    **(
                        {}
                        if configured
                        else {"reason": "No effective approved rules configured for this check."}
                    ),
                }
            )
        except Exception:
            warnings.append(f"{rule} could not be completed; manual review is required.")
            checks.append({"check": rule, "status": "failed"})
    for rule, execute in [("R6", alt_text.check), ("R7", color_contrast.check)]:
        try:
            results, status = execute(metadata or {})
            findings.extend(results)
            checks.append(status)
        except Exception:
            checks.append(
                {
                    "check": rule,
                    "status": "not_checked",
                    "reason": "Formatting metadata could not be inspected.",
                }
            )
    return {"findings": findings, "checks": checks, "warnings": warnings}
