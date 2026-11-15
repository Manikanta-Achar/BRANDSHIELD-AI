import importlib
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from asgi_lifespan import LifespanManager
from pydantic import ValidationError
from pymongo.errors import ConnectionFailure

from app.core.config import Settings
from app.main import create_app

FRONTEND_ORIGIN = "https://brandshield-ai-y11i.vercel.app"


def settings(**overrides):
    return Settings(
        _env_file=None,
        environment="test",
        jwt_secret="deployment-test-secret-with-thirty-two-characters",
        cors_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
        **overrides,
    )


async def test_routes_remain_available_when_database_startup_fails(monkeypatch, caplog):
    private_error = "private-connection-details-must-not-be-logged"
    connect = AsyncMock(side_effect=RuntimeError(private_error))
    monkeypatch.setattr(importlib.import_module("app.main"), "connect", connect)
    app = create_app(settings())
    async with LifespanManager(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            root = await client.get("/")
            assert root.status_code == 200
            assert root.json() == {"status": "ok", "service": "BRANDSHIELD-AI API"}
            live = await client.get("/health/live")
            assert live.status_code == 200
            assert live.json() == {"status": "alive"}
            assert (await client.get("/docs")).status_code == 200
            schema = await client.get("/openapi.json")
            assert schema.status_code == 200
            assert schema.json()["info"]["title"] == "BrandShield AI"
            assert {
                "/api/v1/auth/register",
                "/api/v1/auth/login",
                "/api/v1/auth/me",
                "/api/v1/auth/logout",
                "/api/v1/workspaces",
                "/api/v1/submissions",
                "/api/v1/uploads",
                "/api/v1/reviews",
            }.issubset(schema.json()["paths"])
            ready = await client.get("/health/ready")
            assert ready.status_code == 503
            assert ready.json() == {"status": "unavailable", "database": "not connected"}
            protected = await client.get("/api/v1/auth/me")
            assert protected.status_code == 503
            assert "Database unavailable" in protected.json()["detail"]
    assert "RuntimeError" in caplog.text
    assert private_error not in caplog.text


async def test_readiness_reuses_lifespan_connection_and_reports_connection_loss(monkeypatch):
    db = SimpleNamespace(command=AsyncMock(return_value={"ok": 1}))
    client = SimpleNamespace(close=AsyncMock())
    connect = AsyncMock(return_value=(client, db))
    monkeypatch.setattr(importlib.import_module("app.main"), "connect", connect)
    app = create_app(settings())
    async with LifespanManager(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http:
            for _ in range(2):
                ready = await http.get("/health/ready")
                assert ready.status_code == 200
                assert ready.json() == {"status": "ready", "database": "connected"}
            db.command.side_effect = ConnectionFailure("private database details")
            unavailable = await http.get("/health/ready")
            assert unavailable.status_code == 503
            assert unavailable.json() == {"status": "unavailable", "database": "not connected"}
    connect.assert_awaited_once()
    client.close.assert_awaited_once()


@pytest.mark.parametrize("origin", [FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"])
async def test_cors_allows_configured_origins_and_authorization_headers(origin):
    app = create_app(settings())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin
        assert "authorization" in response.headers["access-control-allow-headers"].lower()
        actual = await client.get("/health/live", headers={"Origin": origin})
        assert actual.headers["access-control-allow-origin"] == origin


async def test_cors_rejects_unconfigured_origins():
    app = create_app(settings())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/api/v1/auth/login",
            headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"},
        )
        assert response.status_code == 400
        assert "access-control-allow-origin" not in response.headers


async def test_vercel_frontend_is_allowed_with_local_only_dashboard_cors(monkeypatch):
    deployment = json.loads((Path(__file__).parents[1] / "vercel.json").read_text())
    monkeypatch.setenv("FRONTEND_ORIGIN", deployment["env"]["FRONTEND_ORIGIN"])
    monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:5173"]')
    configured = Settings(_env_file=None, environment="test")
    app = create_app(configured)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        for origin in (FRONTEND_ORIGIN, "http://localhost:5173"):
            preflight = await client.options(
                "/api/v1/auth/login",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization,content-type",
                },
            )
            assert preflight.status_code == 200
            assert preflight.headers["access-control-allow-origin"] == origin
        unavailable = await client.get("/api/v1/auth/me", headers={"Origin": FRONTEND_ORIGIN})
        assert unavailable.status_code == 503
        assert unavailable.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
        for origin in ("https://untrusted.example", FRONTEND_ORIGIN + ".untrusted.example"):
            rejected = await client.options(
                "/api/v1/auth/login",
                headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
            )
            assert rejected.status_code == 400
            assert "access-control-allow-origin" not in rejected.headers


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "https://*.vercel.app",
        "https://frontend.example/login",
        "https://frontend.example?token=example",
        "https://frontend.example#fragment",
        "https://user:password@frontend.example",
        "file:///frontend.example",
    ],
)
def test_frontend_origin_rejects_unsafe_or_non_origin_values(origin):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, frontend_origin=origin)


async def test_real_database_readiness(env):
    response = await env.client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "connected"}
