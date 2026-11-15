from functools import lru_cache

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)
    environment: str = "development"
    mongodb_uri: SecretStr = SecretStr("")
    mongodb_database: str = "brandshield"
    jwt_secret: SecretStr = SecretStr("")
    jwt_issuer: str = "brandshield-api"
    access_token_minutes: int = Field(240, ge=5, le=1440)
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    frontend_origin: AnyHttpUrl | None = None
    max_upload_bytes: int = Field(10 * 1024 * 1024, ge=1024, le=20 * 1024 * 1024)
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = ""
    ai_timeout_seconds: int = Field(20, ge=1, le=60)
    enable_demo_seed: bool = False

    @field_validator("frontend_origin")
    @classmethod
    def validate_frontend_origin(cls, origin):
        if origin is not None and (
            origin.path not in (None, "/")
            or "*" in (origin.host or "")
            or origin.query is not None
            or origin.fragment is not None
            or origin.username is not None
            or origin.password is not None
        ):
            raise ValueError("FRONTEND_ORIGIN must be an HTTP or HTTPS origin without a path or credentials")
        return origin

    @property
    def allowed_cors_origins(self) -> list[str]:
        origins = list(self.cors_origins)
        if self.frontend_origin is not None:
            origin = str(self.frontend_origin).rstrip("/")
            if origin not in origins:
                origins.append(origin)
        return origins

    @model_validator(mode="after")
    def production_configuration(self):
        if self.environment == "production":
            if not self.mongodb_uri.get_secret_value() or len(self.jwt_secret.get_secret_value()) < 32:
                raise ValueError("Production requires MONGODB_URI and a JWT_SECRET of at least 32 characters")
            if not self.allowed_cors_origins or "*" in self.allowed_cors_origins or self.enable_demo_seed:
                raise ValueError("Production requires explicit CORS origins and disabled demo seeding")
        return self


@lru_cache
def get_settings():
    return Settings()
