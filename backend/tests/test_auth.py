import jwt
import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.core.security import decode_token, hash_password, verify_password


def test_password_hash_and_invalid_jwt():
    value = hash_password("long-test-password")
    assert verify_password("long-test-password", value)
    assert not verify_password("wrong-password", value)
    settings = Settings(_env_file=None, jwt_secret="test-only-secret-with-thirty-two-characters")
    token = jwt.encode({"sub": "x", "exp": 1}, settings.jwt_secret.get_secret_value(), algorithm="HS256")
    with pytest.raises(HTTPException) as error:
        decode_token(token, settings)
    assert error.value.status_code == 401


async def test_registration_login_logout_and_profile(env):
    details = {"name": "New Creator", "email": "new@example.com", "password": "Long-enough-passphrase-42"}
    response = await env.call("POST", "/auth/register", role=None, json=details)
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "Content Creator"
    assert "password_hash" not in response.text
    assert (await env.call("POST", "/auth/register", role=None, json=details)).status_code == 409
    assert (
        await env.call("POST", "/auth/register", role=None, json={**details, "role": "Admin"})
    ).status_code == 422
    assert (
        await env.call("POST", "/auth/register", role=None, json={**details, "email": "invalid"})
    ).status_code == 422
    assert (
        await env.call(
            "POST", "/auth/login", role=None, json={"email": details["email"], "password": "wrong"}
        )
    ).status_code == 401
    assert (await env.call("GET", "/auth/me", role=None)).status_code == 401
    assert (await env.call("GET", "/auth/me")).status_code == 200
    assert (
        await env.call("PATCH", "/users/me", json={"name": "Renamed Creator", "email": "creator@example.com"})
    ).status_code == 200
    assert (
        await env.call("PATCH", "/users/me/preferences", json={"showActivity": False, "reviewsOnly": True})
    ).status_code == 200
    assert (await env.call("GET", "/users/me/preferences")).json()["showActivity"] is False
    assert (await env.call("POST", "/auth/logout")).status_code == 204
    assert (await env.call("GET", "/auth/me")).status_code == 401
