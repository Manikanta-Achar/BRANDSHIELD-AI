from bson import ObjectId

from scripts.seed_demo import knowledge_rows


async def test_knowledge_crud_roles_history_and_isolation(env):
    row = knowledge_rows(env.workspace)[1]
    assert (await env.call("POST", "/knowledge", json=row)).status_code == 403
    response = await env.call("POST", "/knowledge", "Admin", json={**row, "title": "Never promise miracles"})
    assert response.status_code == 201, response.text
    item = response.json()
    assert (await env.call("GET", f"/knowledge/{item['id']}")).json()["revision"] == 1
    values = {**row, "title": item["title"], "content": "Updated approved policy", "expectedRevision": 1}
    response = await env.call("PATCH", f"/knowledge/{item['id']}", "Admin", json=values)
    assert response.status_code == 200, response.text
    assert (await env.call("PATCH", f"/knowledge/{item['id']}", "Admin", json=values)).status_code == 409
    history = (await env.call("GET", f"/knowledge/{item['id']}/versions")).json()
    assert [r["revision"] for r in history] == [1, 2]
    assert history[0]["content"] == row["content"]
    assert (await env.call("POST", f"/knowledge/{item['id']}/archive", "Admin")).json()[
        "status"
    ] == "Archived"
    assert (
        await env.call(
            "GET", f"/knowledge?workspace_id={env.workspace}&q=miracles&category=Prohibited%20Words"
        )
    ).status_code == 200
    foreign = str(ObjectId())
    assert (await env.call("GET", f"/knowledge?workspace_id={foreign}")).status_code == 403
    assert (await env.call("GET", f"/submissions?workspace_id={foreign}", "Admin")).status_code == 403
    assert (await env.call("GET", "/knowledge/invalid-id")).status_code == 422
    assert (await env.call("GET", f"/knowledge/{ObjectId()}")).status_code == 404


async def test_membership_and_own_submission_boundaries(env):
    assert (await env.call("POST", "/workspaces", json={"name": "Unauthorized"})).status_code == 403
    w = await env.call("POST", "/workspaces", "Admin", json={"name": "Private brand"})
    assert w.status_code == 201, w.text
    wid = w.json()["id"]
    assert (await env.call("GET", f"/workspaces/{wid}")).status_code == 403
    assert (
        await env.call(
            "PUT", f"/workspaces/{wid}/members", json={"email": "creator@example.com", "role": "Admin"}
        )
    ).status_code == 403
    assert (
        await env.call(
            "PUT",
            f"/workspaces/{wid}/members",
            "Admin",
            json={"email": "creator@example.com", "role": "Agency Partner"},
        )
    ).status_code == 200
    assert (await env.call("GET", f"/workspaces/{wid}")).status_code == 200
    assert (await env.call("POST", "/knowledge", json={**knowledge_rows(wid)[0]})).status_code == 403
    s = await env.submission(analyse=False)
    outsider = {
        "name": "Outside Creator",
        "email": "outside@example.com",
        "password": "Outside-test-password-42",
    }
    account = (await env.call("POST", "/auth/register", None, json=outsider)).json()
    env.headers["Outside"] = {"Authorization": "Bearer " + account["access_token"]}
    await env.call(
        "PUT",
        f"/workspaces/{env.workspace}/members",
        "Admin",
        json={"email": outsider["email"], "role": "Content Creator"},
    )
    assert (await env.call("GET", f"/submissions/{s['id']}", "Outside")).status_code == 403
    assert (await env.call("GET", f"/submissions?workspace_id={env.workspace}", "Outside")).json() == []
    assert (await env.call("GET", f"/audit?workspace_id={env.workspace}", "Outside")).json() == []
    assert (await env.call("GET", f"/reviews?workspace_id={env.workspace}")).status_code == 403
    assert (
        await env.call("DELETE", f"/workspaces/{wid}/members/{env.users['Admin']['_id']}", "Admin")
    ).status_code == 409
