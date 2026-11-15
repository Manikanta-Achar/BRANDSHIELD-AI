import secrets
from datetime import timedelta

import jwt
from fastapi import HTTPException
from pwdlib import PasswordHash

from app.utils.text_diff import utcnow

password_hasher = PasswordHash.recommended()
DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(24))


def hash_password(password):
    return password_hasher.hash(password)


def verify_password(password, hashed):
    try:
        return password_hasher.verify(password, hashed)
    except (ValueError, TypeError):
        return False


def issue_token(user, settings):
    key = settings.jwt_secret.get_secret_value()
    if len(key) < 32:
        raise HTTPException(503, "Authentication is not configured")
    now = utcnow()
    return jwt.encode(
        {
            "sub": str(user["_id"]),
            "ver": user.get("token_version", 0),
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_minutes),
            "iss": settings.jwt_issuer,
            "aud": "brandshield-web",
        },
        key,
        algorithm="HS256",
    )


def decode_token(token, settings):
    if len(settings.jwt_secret.get_secret_value()) < 32:
        raise HTTPException(503, "Authentication is not configured")
    try:
        return jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience="brandshield-web",
            options={"require": ["sub", "exp", "iat", "ver"]},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid or expired access token", headers={"WWW-Authenticate": "Bearer"})
