"""
Application configuration using Pydantic BaseSettings.
Reads from environment variables or .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://resolvehub_user:resolvehub_pass@localhost:5432/resolvehub"

    # JWT
    SECRET_KEY: str = "change-this-to-a-random-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"

    # App
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Project
    PROJECT_NAME: str = "ResolveHub"
    API_PREFIX: str = "/api"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
