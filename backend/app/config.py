import os
from pydantic_settings import BaseSettings
from functools import lru_cache

# Find .env in backend directory or current working directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_file_path = os.path.join(backend_dir, ".env")
if not os.path.exists(env_file_path):
    env_file_path = ".env"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./resolvehub.db"

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
        env_file = env_file_path
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
