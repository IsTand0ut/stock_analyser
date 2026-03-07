from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # --- App ---
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str  # REQUIRED — no default

    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # --- Database ---
    DATABASE_URL: str  # e.g. postgresql+asyncpg://user:pass@localhost:5432/stockdb
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # --- Redis ---
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_QUOTE: int = 60        # seconds
    CACHE_TTL_HISTORY: int = 3600    # 1 hour
    CACHE_TTL_NEWS: int = 900        # 15 minutes

    # --- Auth ---
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- External APIs ---
    ALPHA_VANTAGE_KEY: str = ""
    NEWS_API_KEY: str = ""
    POLYGON_API_KEY: str = ""

    # --- Celery ---
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"


settings = Settings()
