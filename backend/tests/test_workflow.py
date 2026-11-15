import pytest

from scripts.seed_demo import CLEAN


async def test_correct_revise_review_approve_and_audit(env):
    s = await env.submission()
    first = s["currentVersionId"]
    assert s["status"] == "Needs Revision"
    assert (
        await env.call("POST", f"/submissions/{s['id']}/review", json={"expectedVersionId": first})
    ).status_code == 409
    for finding in s["findings"]:
        response = await env.call(
            "PATCH",
            f"/submissions/{s['id']}/findings/{finding['id']}",
            json={"resolution": "Accepted", "expectedVersionId": first},
        )
        assert response.status_code == 200, response.text
    s = (await env.call("GET", f"/submissions/{s['id']}")).json()
    assert s["revisedContent"] != s["versions"][0]["content"]
    assert (
        await env.call("POST", f"/submissions/{s['id']}/review", json={"expectedVersionId": first})
    ).status_code == 409
    response = await env.call(
        "POST",
        f"/submissions/{s['id']}/versions",
        json={"content": s["revisedContent"], "expectedVersionId": first},
    )
    assert response.status_code == 201, response.text
    s = response.json()
    assert len(s["versions"]) == 2 and s["versions"][0]["findings"]
    stale = await env.call(
        "POST", f"/submissions/{s['id']}/versions", json={"content": CLEAN, "expectedVersionId": first}
    )
    assert stale.status_code == 409
    response = await env.call("POST", f"/submissions/{s['id']}/analysis")
    assert response.status_code == 200, response.text
    s = response.json()
    assert s["findings"] == []
    response = await env.call(
        "POST", f"/submissions/{s['id']}/review", json={"expectedVersionId": s["currentVersionId"]}
    )
    assert response.status_code == 200, response.text
    s = response.json()
    decision = {
        "expectedVersionId": s["currentVersionId"],
        "reviewRequestId": s["reviewRequestId"],
        "decision": "Approved",
        "comment": "Checked evidence and corrected product claims.",
        "acknowledged": False,
    }
    assert (await env.call("POST", f"/reviews/{s['id']}/decision", json=decision)).status_code == 403
    assert (
        await env.call(
            "POST",
            f"/submissions/{s['id']}/versions",
            json={"content": CLEAN, "expectedVersionId": s["currentVersionId"]},
        )
    ).status_code == 409
    queue = (await env.call("GET", f"/reviews?workspace_id={env.workspace}", "Reviewer")).json()
    assert [q["id"] for q in queue] == [s["id"]]
    assert (
        await env.call(
            "POST",
            f"/reviews/{s['id']}/comments",
            "Reviewer",
            json={"comment": "Reviewed the updated battery specification."},
        )
    ).status_code == 201
    response = await env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=decision)
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "Approved"
    assert response.json()["decisions"][0]["contentVersionId"] == s["currentVersionId"]
    assert (
        await env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=decision)
    ).status_code == 409
    fresh = (await env.call("GET", f"/submissions/{s['id']}", "Reviewer")).json()
    assert fresh["status"] == "Approved" and len(fresh["versions"]) == 2
    events = (await env.call("GET", f"/audit?workspace_id={env.workspace}", "Admin")).json()
    approval = next(e for e in events if e["action"] == "Content approved")
    assert approval["contentVersionId"] == s["currentVersionId"] and approval["previousState"] == "in_review"
    assert approval["actorId"] == str(env.users["Reviewer"]["_id"])
    assert (await env.call("DELETE", f"/audit/{approval['id']}", "Admin")).status_code in (404, 405)
    assert (
        await env.call("PATCH", f"/audit/{approval['id']}", "Admin", json={"action": "Changed"})
    ).status_code in (404, 405)
    stats = (await env.call("GET", f"/dashboard?workspace_id={env.workspace}", "Admin")).json()
    assert stats["totalSubmissions"] == stats["approvedSubmissions"] == 1 and stats["pendingReviews"] == 0


@pytest.mark.parametrize("decision", ["Rejected", "Needs Revision"])
async def test_reject_request_changes_and_stale_review(env, decision):
    s = await env.reviewable()
    old_request = s["reviewRequestId"]
    payload = {
        "expectedVersionId": s["currentVersionId"],
        "reviewRequestId": old_request,
        "decision": decision,
        "comment": "Please revise this content for the upcoming campaign.",
        "acknowledged": True,
    }
    response = await env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=payload)
    assert response.status_code == 200 and response.json()["status"] == decision
    response = await env.call(
        "POST",
        f"/submissions/{s['id']}/versions",
        json={"content": CLEAN + " New edition.", "expectedVersionId": s["currentVersionId"]},
    )
    assert response.status_code == 201, response.text
    s = (await env.call("POST", f"/submissions/{s['id']}/analysis")).json()
    s = (
        await env.call(
            "POST", f"/submissions/{s['id']}/review", json={"expectedVersionId": s["currentVersionId"]}
        )
    ).json()
    payload["expectedVersionId"] = s["currentVersionId"]
    assert (
        await env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=payload)
    ).status_code == 409


async def test_high_and_uncertain_findings_need_reason_and_acknowledgement(env):
    s = await env.submission()
    for finding in s["findings"]:
        path = f"/submissions/{s['id']}/findings/{finding['id']}"
        invalid = {"expectedVersionId": s["currentVersionId"], "resolution": "Dismissed", "reason": "no"}
        assert (await env.call("PATCH", path, json=invalid)).status_code == 422
        valid = {
            **invalid,
            "resolution": "Challenged",
            "reason": "Please verify this wording with the campaign owner.",
        }
        assert (await env.call("PATCH", path, json=valid)).status_code == 200
    s = (
        await env.call(
            "POST", f"/submissions/{s['id']}/review", json={"expectedVersionId": s["currentVersionId"]}
        )
    ).json()
    decision = {
        "expectedVersionId": s["currentVersionId"],
        "reviewRequestId": s["reviewRequestId"],
        "decision": "Rejected",
        "comment": "Unresolved product claims need documented support.",
        "acknowledged": False,
    }
    assert (
        await env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=decision)
    ).status_code == 422
    assert await env.db.reviews.count_documents({"submissionId": s["id"], "kind": "decision"}) == 0
    decision["acknowledged"] = True
    assert (
        await env.call("POST", f"/reviews/{s['id']}/decision", "Reviewer", json=decision)
    ).status_code == 200
