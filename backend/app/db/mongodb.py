from contextlib import asynccontextmanager

from pymongo import ASCENDING, AsyncMongoClient
from pymongo.write_concern import WriteConcern


async def connect(settings):
    uri = settings.mongodb_uri.get_secret_value()
    if not uri:
        raise RuntimeError("MONGODB_URI is not configured")
    client = AsyncMongoClient(uri, serverSelectionTimeoutMS=5000, tz_aware=True)
    try:
        await client.admin.command("ping")
        hello = await client.admin.command("hello")
        if not (hello.get("setName") or hello.get("msg") == "isdbgrid"):
            raise RuntimeError("MongoDB must be a replica set (Atlas supports transactions)")
        db = client[settings.mongodb_database]
        await create_indexes(db)
        return client, db
    except Exception:
        await client.close()
        raise


async def create_indexes(db):
    indexes = {
        "users": [([("email", ASCENDING)], {"unique": True})],
        "workspaces": [([("slug", ASCENDING)], {"unique": True, "sparse": True})],
        "memberships": [([("workspaceId", 1), ("userId", 1)], {"unique": True}), ([("userId", 1)], {})],
        "knowledge_items": [([("workspaceId", 1), ("status", 1), ("effective", 1)], {})],
        "knowledge_versions": [([("itemId", 1), ("revision", 1)], {"unique": True})],
        "submissions": [([("workspaceId", 1), ("ownerId", 1), ("state", 1)], {})],
        "content_versions": [([("submissionId", 1), ("number", 1)], {"unique": True})],
        "findings": [([("contentVersionId", 1)], {})],
        "reviews": [([("submissionId", 1), ("date", -1)], {})],
        "audit_events": [([("workspaceId", 1), ("date", -1)], {})],
        "ai_disclosures": [([("workspaceId", 1), ("contentVersionId", 1)], {})],
        "auth_attempts": [([("key", 1)], {"unique": True}), ([("expiresAt", 1)], {"expireAfterSeconds": 0})],
    }
    for name, specs in indexes.items():
        for keys, options in specs:
            await db[name].create_index(keys, **options)


@asynccontextmanager
async def transaction(db):
    async with db.client.start_session() as session:
        async with await session.start_transaction(write_concern=WriteConcern("majority")):
            yield session
