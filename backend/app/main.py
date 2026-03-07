from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.cache import init_cache
from app.core.exceptions import (
    StockNotFoundError,
    ExternalAPIError,
    stock_not_found_handler,
    external_api_error_handler,
)
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.timing import TimingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize database pool and Redis. Shutdown: close gracefully."""
    await init_db()
    await init_cache()
    yield
    # Connections are closed automatically by the async context managers inside each module.


def create_app() -> FastAPI:
    app = FastAPI(
        title="Stock Analyzer API",
        description="Equities analysis platform with live WebSocket feeds",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # --- Exception handlers ---
    app.add_exception_handler(StockNotFoundError, stock_not_found_handler)
    app.add_exception_handler(ExternalAPIError, external_api_error_handler)

    # --- Middleware (applied bottom-up, so last added = outermost) ---
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(TimingMiddleware)

    # --- Routes ---
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
