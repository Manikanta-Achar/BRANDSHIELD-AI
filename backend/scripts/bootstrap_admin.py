"""Controlled operator-only administrator bootstrap. Run from backend/."""

import argparse
import asyncio
import getpass
import os

from pydantic import EmailStr, TypeAdapter

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.mongodb import connect, transaction
from app.services.audit_service import audit
from app.utils.text_diff import utcnow


async def bootstrap(email, name, password):
    if len(password) < 12:
        raise ValueError("Administrator password must contain at least 12 characters")
    settings = get_settings()
    client, db = await connect(settings)
    try:
        if await db.users.find_one({"role": "Admin"}):
            raise ValueError("An administrator already exists. Use workspace membership management.")
        user = {
            "email": str(TypeAdapter(EmailStr).validate_python(email)).lower(),
            "name": name,
            "password_hash": hash_password(password),
            "role": "Admin",
            "token_version": 0,
            "createdAt": utcnow(),
        }
        async with transaction(db) as session:
            # A unique bootstrap marker serializes simultaneous initial-admin attempts.
            await db.auth_attempts.insert_one({"key": "initial-admin-bootstrap", "count": 1}, session=session)
            await db.users.insert_one(user, session=session)
            await audit(db, user, "Administrator bootstrapped", session=session)
        print("Administrator created. Sign in and create a workspace.")
    finally:
        await client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    secret = os.getenv("INITIAL_ADMIN_PASSWORD") or getpass.getpass("Initial administrator password: ")
    asyncio.run(bootstrap(args.email, args.name, secret))
