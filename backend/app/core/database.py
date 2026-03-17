from typing import Tuple
from urllib.parse import urlparse, urlunparse, urlencode, parse_qs

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


# ---------------------------------------------------------------------------
# Helpers — asyncpg does NOT accept sslmode/channel_binding as URL params;
# strip them and pass ssl=True via connect_args instead.
# ---------------------------------------------------------------------------
def _clean_db_url(url: str) -> Tuple[str, dict]:
    """Return (cleaned_url, connect_args) suitable for asyncpg."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    needs_ssl = "sslmode" in params  # Neon always needs SSL
    # Remove params asyncpg doesn't understand
    for key in ("sslmode", "channel_binding"):
        params.pop(key, None)
    cleaned = urlunparse(parsed._replace(query=urlencode(params, doseq=True)))
    connect_args = {"ssl": True} if needs_ssl else {}
    return cleaned, connect_args


# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
_pool_kwargs = {} if _is_sqlite else {"pool_size": settings.DB_POOL_SIZE, "max_overflow": settings.DB_MAX_OVERFLOW}

if _is_sqlite:
    _db_url = settings.DATABASE_URL
    _connect_args: dict = {}
else:
    _db_url, _connect_args = _clean_db_url(settings.DATABASE_URL)

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    future=True,
    connect_args=_connect_args,
    **_pool_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Declarative base — all ORM models inherit from this
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Lifespan helper
# ---------------------------------------------------------------------------
async def init_db() -> None:
    """Called during app startup. In production, rely on Alembic migrations.
    This is intentionally a no-op here to prevent accidental create_all()."""
    pass  # pragma: no cover


# ---------------------------------------------------------------------------
# Dependency — yields an async session per request
# ---------------------------------------------------------------------------
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
