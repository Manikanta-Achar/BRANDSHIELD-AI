import hashlib

from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pymongo.errors import DuplicateKeyError

from app.core.dependencies import current_user, database
from app.core.security import DUMMY_HASH, hash_password, verify_password
from app.db.mongodb import transaction
from app.schemas.auth import Login, Register
from app.services.audit_service import audit
from app.services.auth_service import authentication, throttle, user_view
from app.utils.text_diff import utcnow

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201)
async def register(values: Register, request: Request, response: Response, db=Depends(database)):
    await throttle(db, "register:" + request.client.host, 15)
    user = {
        "name": values.name,
        "email": str(values.email).lower(),
        "password_hash": await to_thread.run_sync(hash_password, values.password),
        "role": "Content Creator",
        "token_version": 0,
        "createdAt": utcnow(),
    }
    # Validate authentication configuration before committing the account.
    if len(request.app.state.settings.jwt_secret.get_secret_value()) < 32:
        raise HTTPException(503, "Authentication is not configured")
    try:
        async with transaction(db) as session:
            await db.users.insert_one(user, session=session)
            await audit(db, user, "Account registered", session=session)
    except DuplicateKeyError:
        raise HTTPException(409, "An account already exists for this email")
    response.headers["Cache-Control"] = "no-store"
    return authentication(user, request.app.state.settings)


@router.post("/login")
async def login(values: Login, request: Request, response: Response, db=Depends(database)):
    email = str(values.email).lower()
    key = hashlib.sha256(email.encode()).hexdigest()
    await throttle(db, "login:" + key, 30)
    await throttle(db, "ip:" + request.client.host, 120)
    user = await db.users.find_one({"email": email})
    valid = await to_thread.run_sync(
        verify_password, values.password, user["password_hash"] if user else DUMMY_HASH
    )
    if not valid or not user or user.get("disabled"):
        raise HTTPException(401, "Invalid email or password")
    await db.auth_attempts.delete_one({"key": "login:" + key})
    response.headers["Cache-Control"] = "no-store"
    return authentication(user, request.app.state.settings)


@router.get("/me")
async def me(user=Depends(current_user)):
    return user_view(user)


@router.post("/logout", status_code=204)
async def logout(user=Depends(current_user), db=Depends(database)):
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"token_version": 1}})
