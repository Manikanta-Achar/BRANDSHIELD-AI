from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token
from app.utils.text_diff import oid

bearer = HTTPBearer(auto_error=False)


def database(request: Request):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(503, "Database unavailable. Configure MongoDB and restart the API.")
    return db


async def current_user(
    request: Request, credentials: HTTPAuthorizationCredentials = Depends(bearer), db=Depends(database)
):
    if credentials is None:
        raise HTTPException(401, "Sign in to continue", headers={"WWW-Authenticate": "Bearer"})
    payload = decode_token(credentials.credentials, request.app.state.settings)
    try:
        user_id = oid(payload["sub"])
    except HTTPException:
        raise HTTPException(401, "Invalid access token")
    user = await db.users.find_one({"_id": user_id})
    if not user or user.get("disabled") or user.get("token_version", 0) != payload["ver"]:
        raise HTTPException(401, "Session expired. Sign in again.")
    return user
