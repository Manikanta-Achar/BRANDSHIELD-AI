import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError, OperationFailure, PyMongoError

from app.api.v1.router import router
from app.core.config import get_settings
from app.db.mongodb import connect
from app.utils.file_validation import BodyLimitMiddleware

logger = logging.getLogger("brandshield")


def create_app(settings=None):
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app):
        app.state.settings = settings
        app.state.db = None
        client = None
        try:
            client, app.state.db = await connect(settings)
        except Exception as error:
            # Driver exception messages may contain hostnames or credentials.
            logger.error(
                "Database startup failed (%s). Check private server configuration.", type(error).__name__
            )
        yield
        if client is not None:
            await client.close()

    app = FastAPI(title="BrandShield AI", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings
    app.add_middleware(BodyLimitMiddleware, upload_limit=settings.max_upload_bytes)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(PyMongoError)
    async def database_error(request, error):
        if isinstance(error, DuplicateKeyError):
            return JSONResponse({"detail": "Conflicting record. Reload before retrying."}, status_code=409)
        if isinstance(error, OperationFailure) and error.has_error_label("TransientTransactionError"):
            return JSONResponse({"detail": "Data changed concurrently. Reload and retry."}, status_code=409)
        logger.error("Database operation failed (%s)", type(error).__name__)
        return JSONResponse({"detail": "Database unavailable. Please retry."}, status_code=503)

    @app.get("/health/live", tags=["Health"])
    async def live():
        return {"status": "alive"}

    @app.get("/health/ready", tags=["Health"])
    async def ready():
        db = getattr(app.state, "db", None)
        if db is None:
            return JSONResponse({"status": "unavailable", "database": "not connected"}, status_code=503)
        try:
            await db.command("ping")
        except PyMongoError:
            return JSONResponse({"status": "unavailable", "database": "not connected"}, status_code=503)
        if len(settings.jwt_secret.get_secret_value()) < 32:
            return JSONResponse(
                {"status": "unavailable", "authentication": "not configured"}, status_code=503
            )
        return {"status": "ready", "database": "connected"}

    app.include_router(router)
    return app


app = create_app()
