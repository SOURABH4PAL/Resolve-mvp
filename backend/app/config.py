import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Find .env in backend directory, root directory, or current working directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)

env_candidates = [
    os.path.join(backend_dir, ".env"),
    os.path.join(root_dir, ".env"),
    ".env"
]
env_file_path = next((p for p in env_candidates if os.path.exists(p)), ".env")


class Settings(BaseSettings):
    # App & Environment
    PROJECT_NAME: str = "ResolveHub"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "sqlite:///./resolvehub.db"

    # JWT
    SECRET_KEY: str = "change-this-to-a-random-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"

    # App limits & storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # CORS configuration (explicit origins, no wildcard when credentials enabled)
    CORS_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip().startswith("["):
                import json
                try:
                    parsed = json.loads(v)
                    return [origin.strip() for origin in parsed if origin.strip() and origin.strip() != "*"]
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip() and origin.strip() != "*"]
        elif isinstance(v, list):
            return [origin.strip() for origin in v if origin.strip() and origin.strip() != "*"]
        return ["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=env_file_path,
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
