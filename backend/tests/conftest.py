import os
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from asgi_lifespan import LifespanManager

from app.core.config import Settings
from app.main import create_app
from scripts.seed_demo import CLEAN, SAMPLE, seed

TEST_PASSWORD = "Isolated-test-passphrase-42"


@pytest.fixture
async def env():
    uri = os.getenv("TEST_MONGODB_URI")
    if not uri:
        pytest.skip("Set TEST_MONGODB_URI to a dedicated replica set for real database integration tests")
    name = "brandshield_test_" + uuid4().hex
    settings = Settings(
        _env_file=None,
        mongodb_uri=uri,
        mongodb_database=name,
        jwt_secret="isolated-test-secret-never-use-in-production",
        environment="test",
    )
    app = create_app(settings)
    async with LifespanManager(app, startup_timeout=30, shutdown_timeout=30):
        db = app.state.db
        assert db is not None, "Test MongoDB must be reachable and support replica-set transactions"
        workspace, users = await seed(
            db,
            [
                (role, email, TEST_PASSWORD)
                for role, email in [
                    ("Admin", "admin@example.com"),
                    ("Content Creator", "creator@example.com"),
                    ("Reviewer", "reviewer@example.com"),
                ]
            ],
        )
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            headers = {}
            for role, user in users.items():
                response = await client.post(
                    "/api/v1/auth/login", json={"email": user["email"], "password": TEST_PASSWORD}
                )
                assert response.status_code == 200, response.text
                headers[role] = {"Authorization": "Bearer " + response.json()["access_token"]}

            async def call(method, path, role="Content Creator", **kwargs):
                return await client.request(method, "/api/v1" + path, headers=headers.get(role, {}), **kwargs)

            async def submission(text=SAMPLE, analyse=True):
                response = await call(
                    "POST",
                    "/submissions",
                    json={
                        "workspaceId": str(workspace["_id"]),
                        "title": "Test advertisement",
                        "channel": "Advertisement",
                        "content": text,
                    },
                )
                assert response.status_code == 201, response.text
                s = response.json()["submission"]
                if analyse:
                    response = await call("POST", f"/submissions/{s['id']}/analysis")
                    assert response.status_code == 200, response.text
                    s = response.json()
                return s

            async def reviewable():
                s = await submission(CLEAN)
                response = await call(
                    "POST",
                    f"/submissions/{s['id']}/review",
                    json={"expectedVersionId": s["currentVersionId"]},
                )
                assert response.status_code == 200, response.text
                return response.json()

            yield SimpleNamespace(
                app=app,
                db=db,
                client=client,
                call=call,
                headers=headers,
                workspace=str(workspace["_id"]),
                users=users,
                submission=submission,
                reviewable=reviewable,
            )
        # Always drop only this fixture's generated database, never caller-supplied production names.
        assert name.startswith("brandshield_test_")
        await db.client.drop_database(name)
