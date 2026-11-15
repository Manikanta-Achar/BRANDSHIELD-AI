"""Explicit, idempotent TechNova seed. No production or default credentials."""

import asyncio
import os

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.mongodb import connect
from app.schemas.knowledge import Knowledge
from app.services.knowledge_service import save_knowledge
from app.utils.text_diff import utcnow

SAMPLE = "Introducing the new Tech Nova smartphone! Enjoy 15 hours of battery life with 100% guaranteed performance. It is the best phone in the world."
CLEAN = "Introducing the TechNova Smartphone. Enjoy up to 10 hours of battery life with dependable performance. Designed for your everyday. Battery life varies by usage."


def knowledge_rows(workspace_id):
    common = {
        "workspaceId": workspace_id,
        "owner": "TechNova brand team",
        "version": "1.0",
        "effective": "2026-01-01",
        "status": "Active",
        "source": "TechNova approved brand handbook",
    }
    rows = [
        {
            "type": "Approved Facts",
            "title": "TechNova Smartphone battery life",
            "content": "Up to 10 hours",
            "source": "TechNova Smartphone specifications: battery",
            "rule": "battery",
            "subject": "TechNova Smartphone",
            "aliases": "TechNova, Tech Nova, smartphone",
            "unit": "hours",
            "approvedValue": 10,
        },
        {
            "type": "Prohibited Words",
            "title": "100% guaranteed",
            "content": "Do not promise guaranteed performance.",
            "replacement": "dependable",
        },
        {
            "type": "Terminology",
            "title": "Tech Nova",
            "content": "Use the approved company name TechNova.",
            "replacement": "TechNova",
        },
        {
            "type": "Required Disclaimers",
            "title": "Battery life disclosure",
            "content": "Battery life varies by usage.",
            "trigger": "battery",
        },
        {
            "type": "Brand Guidelines",
            "title": "Professional and trustworthy tone",
            "content": "Use a professional and trustworthy tone. Absolute or superlative claims including always, guaranteed, best in the world and number one require approved evidence.",
            "rule": "absolute",
            "replacement": "designed for your everyday",
        },
        {
            "type": "Approved Claims",
            "title": "Designed for your everyday",
            "content": "Designed for your everyday.",
        },
        {"type": "Approved Terminology", "title": "Company name", "content": "TechNova"},
        {
            "type": "Approved Facts",
            "title": "Product name",
            "content": "TechNova Smartphone",
            "rule": "reference",
        },
    ]
    return [{**common, **row} for row in rows]


async def seed(db, credentials):
    accounts = {}
    for role, email, password in credentials:
        if len(password) < 12:
            raise ValueError("Every seed password must contain at least 12 characters")
        email = email.lower()
        existing = await db.users.find_one({"email": email})
        if existing and (not existing.get("demoSeed") or existing["role"] != role):
            raise ValueError("Refusing to change a non-seed account or its role")
        if not existing:
            user = {
                "email": email,
                "name": "TechNova " + role,
                "role": role,
                "demoSeed": True,
                "password_hash": hash_password(password),
                "token_version": 0,
                "createdAt": utcnow(),
            }
            await db.users.insert_one(user)
            existing = user
        accounts[role] = existing
    await db.workspaces.update_one(
        {"slug": "technova-demo"},
        {
            "$setOnInsert": {
                "slug": "technova-demo",
                "name": "TechNova",
                "description": "Fictional demonstration brand",
                "initials": "TN",
                "color": "#0d9488",
                "consent": False,
                "kbVersion": 0,
                "retention": "Development records; operator managed.",
                "createdAt": utcnow(),
            }
        },
        upsert=True,
    )
    workspace = await db.workspaces.find_one({"slug": "technova-demo"})
    wid = str(workspace["_id"])
    for role, user in accounts.items():
        await db.memberships.update_one(
            {"workspaceId": wid, "userId": str(user["_id"])},
            {"$setOnInsert": {"role": role, "createdAt": utcnow()}},
            upsert=True,
        )
    for row in knowledge_rows(wid):
        if not await db.knowledge_items.find_one({"workspaceId": wid, "title": row["title"]}):
            await save_knowledge(db, accounts["Admin"], Knowledge(**row))
    return workspace, accounts


async def main():
    settings = get_settings()
    if settings.environment == "production" or not settings.enable_demo_seed:
        raise ValueError("Seeding requires non-production ENVIRONMENT and ENABLE_DEMO_SEED=true")
    credentials = []
    for label, role in [("ADMIN", "Admin"), ("CREATOR", "Content Creator"), ("REVIEWER", "Reviewer")]:
        email, password = os.environ.get(f"DEMO_{label}_EMAIL"), os.environ.get(f"DEMO_{label}_PASSWORD")
        if not email or not password:
            raise ValueError(f"Configure DEMO_{label}_EMAIL and DEMO_{label}_PASSWORD privately")
        credentials.append((role, email, password))
    client, db = await connect(settings)
    try:
        await seed(db, credentials)
        print(
            "TechNova workspace and approved knowledge are ready. Existing accounts and passwords were preserved."
        )
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
