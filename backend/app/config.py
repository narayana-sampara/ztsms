from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Zefinity Student LMS API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/student_lms"
    jwt_secret_key: str = "replace-this-development-key-with-a-strong-secret-before-deployment"
    jwt_issuer: str = "ZefinityLms"
    jwt_audience: str = "ZefinityLms.Web"
    access_token_expire_minutes: int = 480
    backend_cors_origins: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
