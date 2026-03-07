# 📈 Stock Analyzer — Full Stack Blueprint
### React + FastAPI | Morgan Stanley & JPMorgan Interview Project

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Full Directory Structure](#3-full-directory-structure)
4. [Tech Stack & All Requirements](#4-tech-stack--all-requirements)
5. [Backend — FastAPI](#5-backend--fastapi)
   - [Project Setup](#51-project-setup)
   - [Environment Configuration](#52-environment-configuration)
   - [Database Models](#53-database-models)
   - [Pydantic Schemas](#54-pydantic-schemas)
   - [Services Layer](#55-services-layer)
   - [API Routes](#56-api-routes)
   - [WebSocket Live Feed](#57-websocket-live-feed)
   - [Authentication](#58-authentication)
   - [Caching Strategy](#59-caching-strategy)
   - [Background Tasks](#510-background-tasks)
   - [Error Handling](#511-error-handling)
   - [Middleware](#512-middleware)
6. [Frontend — React](#6-frontend--react)
   - [Project Setup](#61-project-setup)
   - [Folder Structure](#62-folder-structure)
   - [State Management](#63-state-management)
   - [Core Components](#64-core-components)
   - [Pages](#65-pages)
   - [WebSocket Integration](#66-websocket-integration)
   - [API Layer](#67-api-layer)
   - [Charts & Visualizations](#68-charts--visualizations)
7. [Feature Implementation Guide](#7-feature-implementation-guide)
8. [WebSocket Live Feed — Deep Dive](#8-websocket-live-feed--deep-dive)
9. [Code Quality & Best Practices](#9-code-quality--best-practices)
10. [Docker & Deployment](#10-docker--deployment)
11. [Testing Strategy](#11-testing-strategy)
12. [Interview Talking Points](#12-interview-talking-points)
13. [Step-by-Step Build Order](#13-step-by-step-build-order)

---

## 1. Project Overview

A full-stack, production-grade stock analysis platform that replicates the core toolkit of an equities desk: live streaming prices, technical indicators, fundamental valuation, portfolio tracking, and news sentiment — all unified through a clean REST + WebSocket API served by FastAPI and visualized in a React dashboard.

### Core Feature Set

| Feature | Description |
|---|---|
| **Real-time Quotes** | Live bid/ask, %, volume, market cap |
| **Historical OHLCV** | Configurable ranges: 1D, 1W, 1M, 3M, YTD, 1Y, 5Y |
| **Technical Indicators** | RSI, MACD, Bollinger Bands, SMA, EMA |
| **Fundamental Metrics** | P/E, EPS, ROE, Debt/Equity, FCF, EBITDA |
| **DCF Valuation Engine** | Parameterized discounted cash flow model |
| **Portfolio Tracker** | CRUD, real-time P&L, allocation breakdown |
| **Peer Comparison** | Cross-sector multiple benchmarking |
| **Volatility Metrics** | Rolling vol, Sharpe ratio, max drawdown |
| **News Sentiment** | NLP-scored financial headlines per ticker |
| **Backtesting Engine** | MA crossover strategy on historical data |
| **WebSocket Live Feed** | Streaming price ticks, sub-second updates |
| **Price Alerts** | Threshold-based email/webhook notifications |
| **Options Chain** | Calls/puts, IV, delta, gamma for nearest expiry |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                        │
│  React + Vite + TanStack Query + Recharts + Zustand         │
│  WebSocket client (native WS API)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST + WS
┌──────────────────────────▼──────────────────────────────────┐
│                         API GATEWAY                         │
│  FastAPI — Uvicorn/Gunicorn ASGI server                     │
│  JWT Auth Middleware │ Rate Limiter │ CORS │ GZIP            │
└──────┬──────────────┬──────────────┬──────────────┬─────────┘
       │              │              │              │
┌──────▼───┐  ┌───────▼──┐  ┌───────▼──┐  ┌───────▼────────┐
│  REST    │  │WebSocket │  │  Celery  │  │  Static Docs   │
│ Routers  │  │ Manager  │  │ Workers  │  │  Swagger /docs │
└──────┬───┘  └───────┬──┘  └───────┬──┘  └────────────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼────────────────────────┐
│                       SERVICES LAYER                        │
│  MarketDataService │ IndicatorsService │ SentimentService   │
│  ValuationService  │ PortfolioService  │ AlertService       │
└───────────┬────────────────┬────────────────────────────────┘
            │                │
┌───────────▼──┐    ┌────────▼──────────────┐
│  PostgreSQL  │    │   Redis               │
│  SQLAlchemy  │    │   TTL Cache + Pub/Sub │
│  Alembic     │    │   Celery Broker       │
└──────────────┘    └───────────────────────┘
            │
┌───────────▼──────────────────────────────┐
│         EXTERNAL DATA PROVIDERS          │
│  yfinance │ Alpha Vantage │ NewsAPI       │
│  Polygon.io (optional)                   │
└──────────────────────────────────────────┘
```

---

## 3. Full Directory Structure

```
stock-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                        # FastAPI app factory
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py                  # Pydantic BaseSettings
│   │   │   ├── security.py                # JWT create/verify
│   │   │   ├── cache.py                   # Redis client + helpers
│   │   │   ├── database.py                # SQLAlchemy async engine
│   │   │   └── exceptions.py              # Custom exception classes
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py              # Aggregates all v1 routers
│   │   │       ├── auth.py                # /auth/login, /auth/register
│   │   │       ├── stocks.py              # /stocks routes
│   │   │       ├── portfolio.py           # /portfolio routes
│   │   │       ├── analytics.py           # /analytics routes
│   │   │       ├── alerts.py              # /alerts routes
│   │   │       └── ws.py                  # WebSocket /ws/stocks/{ticker}
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── market_data.py             # yfinance abstraction layer
│   │   │   ├── indicators.py              # TA calculations (pandas-ta)
│   │   │   ├── sentiment.py               # News fetch + NLP scoring
│   │   │   ├── valuation.py               # DCF engine
│   │   │   ├── portfolio.py               # P&L, allocation logic
│   │   │   ├── backtesting.py             # MA crossover engine
│   │   │   └── options.py                 # Options chain + Greeks
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                    # User ORM model
│   │   │   ├── portfolio.py               # Portfolio + Holding models
│   │   │   ├── watchlist.py               # Watchlist model
│   │   │   └── alert.py                   # PriceAlert model
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                    # LoginRequest, TokenResponse
│   │   │   ├── stock.py                   # Quote, OHLCV, Fundamentals
│   │   │   ├── portfolio.py               # Portfolio, Holding schemas
│   │   │   ├── analytics.py               # Indicators, DCF, Backtest
│   │   │   └── alert.py                   # AlertCreate, AlertResponse
│   │   │
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py              # Celery configuration
│   │   │   ├── price_alerts.py            # Scheduled alert checks
│   │   │   └── cache_warmup.py            # Pre-cache popular tickers
│   │   │
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── logging.py                 # Request/response logger
│   │       └── timing.py                  # X-Process-Time header
│   │
│   ├── migrations/
│   │   ├── env.py
│   │   └── versions/                      # Alembic migration files
│   │
│   ├── tests/
│   │   ├── conftest.py                    # Fixtures, async test client
│   │   ├── test_stocks.py
│   │   ├── test_portfolio.py
│   │   ├── test_analytics.py
│   │   └── test_ws.py
│   │
│   ├── .env.example
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts                  # Axios instance + interceptors
│   │   │   ├── stocks.ts                  # Stock API calls
│   │   │   ├── portfolio.ts               # Portfolio API calls
│   │   │   ├── analytics.ts               # Analytics API calls
│   │   │   └── auth.ts                    # Auth API calls
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                        # shadcn/ui base components
│   │   │   ├── charts/
│   │   │   │   ├── CandlestickChart.tsx
│   │   │   │   ├── IndicatorChart.tsx
│   │   │   │   ├── CorrelationHeatmap.tsx
│   │   │   │   └── PortfolioPieChart.tsx
│   │   │   ├── stock/
│   │   │   │   ├── QuoteCard.tsx
│   │   │   │   ├── FundamentalsTable.tsx
│   │   │   │   ├── NewsPanel.tsx
│   │   │   │   └── OptionChain.tsx
│   │   │   ├── portfolio/
│   │   │   │   ├── HoldingRow.tsx
│   │   │   │   ├── PortfolioSummary.tsx
│   │   │   │   └── AddHoldingModal.tsx
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── LiveTickerBanner.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts            # WS connection manager
│   │   │   ├── useStockQuote.ts           # TanStack Query hook
│   │   │   ├── usePortfolio.ts
│   │   │   └── useIndicators.ts
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── StockDetail.tsx
│   │   │   ├── Portfolio.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Screener.tsx
│   │   │   └── Login.tsx
│   │   │
│   │   ├── store/
│   │   │   ├── authStore.ts               # Zustand auth state
│   │   │   ├── watchlistStore.ts
│   │   │   └── liveDataStore.ts           # WS streamed prices
│   │   │
│   │   ├── types/
│   │   │   ├── stock.ts
│   │   │   ├── portfolio.ts
│   │   │   └── analytics.ts
│   │   │
│   │   └── utils/
│   │       ├── formatters.ts              # Currency, % formatters
│   │       ├── indicators.ts              # Client-side TA helpers
│   │       └── constants.ts
│   │
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx.conf
├── CLAUDE.md                              # Claude Code context file
└── README.md
```

---

## 4. Tech Stack & All Requirements

### Backend — `requirements.txt`

```txt
# --- Core ---
fastapi==0.115.0
uvicorn[standard]==0.30.0
gunicorn==22.0.0

# --- Data Validation ---
pydantic==2.8.0
pydantic-settings==2.4.0
email-validator==2.2.0

# --- Database ---
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0             # async PostgreSQL driver
alembic==1.13.2

# --- Cache ---
redis[hiredis]==5.0.8
aioredis==2.0.1

# --- Auth ---
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9

# --- Market Data ---
yfinance==0.2.43
pandas==2.2.2
numpy==1.26.4
pandas-ta==0.3.14b         # Technical analysis

# --- Task Queue ---
celery==5.4.0
flower==2.0.1               # Celery monitoring UI

# --- NLP / Sentiment ---
textblob==0.18.0
requests==2.32.3
newsapi-python==0.2.7

# --- Rate Limiting ---
slowapi==0.1.9

# --- HTTP ---
httpx==0.27.0               # Async HTTP client

# --- Utilities ---
python-dotenv==1.0.1
tenacity==8.5.0             # Retry logic for external APIs
structlog==24.4.0           # Structured logging

# --- Testing ---
pytest==8.3.2
pytest-asyncio==0.23.8
pytest-cov==5.0.0
httpx==0.27.0               # Also used as async test client
factory-boy==3.3.1          # Test factories
```

### Frontend — `package.json` dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "axios": "^1.7.5",
    "@tanstack/react-query": "^5.55.4",
    "@tanstack/react-query-devtools": "^5.55.4",
    "zustand": "^4.5.5",
    "recharts": "^2.12.7",
    "lightweight-charts": "^4.2.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.439.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "react-hot-toast": "^2.4.1",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "tailwindcss": "^3.4.10",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.45",
    "eslint": "^9.9.1",
    "@typescript-eslint/eslint-plugin": "^8.3.0",
    "prettier": "^3.3.3",
    "vitest": "^2.0.5",
    "@testing-library/react": "^16.0.1"
  }
}
```

---

## 5. Backend — FastAPI

### 5.1 Project Setup

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.cache import init_cache
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.timing import TimingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize DB pool and Redis connection
    await init_db()
    await init_cache()
    yield
    # Shutdown: close connections gracefully


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

    # Middleware — ORDER MATTERS (applied bottom-up)
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

    # Routes
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
```

### 5.2 Environment Configuration

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # App
    APP_ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str                         # REQUIRED — no default
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # Database
    DATABASE_URL: str                       # postgresql+asyncpg://...
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_QUOTE: int = 60              # seconds
    CACHE_TTL_HISTORY: int = 3600

    # Auth
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # External APIs
    ALPHA_VANTAGE_KEY: str = ""
    NEWS_API_KEY: str = ""
    POLYGON_API_KEY: str = ""

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"


settings = Settings()
```

```ini
# backend/.env.example
APP_ENV=development
DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production
DATABASE_URL=postgresql+asyncpg://stockuser:password@localhost:5432/stockdb
REDIS_URL=redis://localhost:6379/0
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
NEWS_API_KEY=your_newsapi_key
ALPHA_VANTAGE_KEY=your_alpha_vantage_key
```

### 5.3 Database Models

```python
# backend/app/models/user.py
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    portfolios: Mapped[list["Portfolio"]] = relationship("Portfolio", back_populates="user")
    alerts: Mapped[list["PriceAlert"]] = relationship("PriceAlert", back_populates="user")
```

```python
# backend/app/models/portfolio.py
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Numeric, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="portfolios")
    holdings: Mapped[list["Holding"]] = relationship(
        "Holding", back_populates="portfolio", cascade="all, delete-orphan"
    )


class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id"), nullable=False)
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    shares: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6))
    avg_cost: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=4))
    purchased_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="holdings")
```

### 5.4 Pydantic Schemas

```python
# backend/app/schemas/stock.py
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


class StockQuote(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_pct: float
    volume: int
    avg_volume: int
    market_cap: Optional[float]
    pe_ratio: Optional[float]
    fifty_two_week_high: float
    fifty_two_week_low: float
    timestamp: datetime

    model_config = {"from_attributes": True}


class OHLCVBar(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoricalData(BaseModel):
    ticker: str
    range: str
    interval: str
    data: List[OHLCVBar]


class Fundamentals(BaseModel):
    ticker: str
    sector: Optional[str]
    industry: Optional[str]
    pe_ratio: Optional[float]
    forward_pe: Optional[float]
    eps: Optional[float]
    revenue: Optional[float]
    gross_margin: Optional[float]
    operating_margin: Optional[float]
    roe: Optional[float]
    debt_to_equity: Optional[float]
    free_cash_flow: Optional[float]
    dividend_yield: Optional[float]
    beta: Optional[float]


class NewsItem(BaseModel):
    title: str
    source: str
    url: str
    published_at: datetime
    sentiment_score: float = Field(ge=-1.0, le=1.0)
    sentiment_label: str   # "positive", "neutral", "negative"


class DCFInput(BaseModel):
    wacc: float = Field(default=0.10, ge=0.01, le=0.50)
    terminal_growth_rate: float = Field(default=0.025, ge=0.0, le=0.10)
    projection_years: int = Field(default=5, ge=1, le=10)
    revenue_growth_rate: Optional[float] = None


class DCFResult(BaseModel):
    ticker: str
    intrinsic_value: float
    current_price: float
    margin_of_safety: float
    upside_pct: float
    assumptions: DCFInput
```

### 5.5 Services Layer

```python
# backend/app/services/market_data.py
import yfinance as yf
import pandas as pd
from typing import Optional
from datetime import datetime
from app.core.cache import cache_get, cache_set
from app.core.config import settings
from app.schemas.stock import StockQuote, HistoricalData, OHLCVBar, Fundamentals
from tenacity import retry, stop_after_attempt, wait_exponential


RANGE_TO_PERIOD = {
    "1D": ("1d", "5m"),
    "1W": ("5d", "15m"),
    "1M": ("1mo", "1h"),
    "3M": ("3mo", "1d"),
    "YTD": ("ytd", "1d"),
    "1Y": ("1y", "1d"),
    "5Y": ("5y", "1wk"),
}


class MarketDataService:

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=4))
    async def get_quote(self, ticker: str) -> StockQuote:
        cache_key = f"quote:{ticker.upper()}"
        cached = await cache_get(cache_key)
        if cached:
            return StockQuote.model_validate_json(cached)

        ticker_obj = yf.Ticker(ticker.upper())
        info = ticker_obj.fast_info

        quote = StockQuote(
            ticker=ticker.upper(),
            name=ticker_obj.info.get("longName", ticker),
            price=info.last_price,
            change=info.last_price - info.previous_close,
            change_pct=((info.last_price - info.previous_close) / info.previous_close) * 100,
            volume=info.three_month_average_volume,  # use intraday when available
            avg_volume=info.three_month_average_volume,
            market_cap=info.market_cap,
            pe_ratio=ticker_obj.info.get("trailingPE"),
            fifty_two_week_high=info.fifty_two_week_high,
            fifty_two_week_low=info.fifty_two_week_low,
            timestamp=datetime.utcnow(),
        )

        await cache_set(cache_key, quote.model_dump_json(), ttl=settings.CACHE_TTL_QUOTE)
        return quote

    async def get_history(self, ticker: str, range: str = "1M") -> HistoricalData:
        period, interval = RANGE_TO_PERIOD.get(range, ("1mo", "1d"))
        cache_key = f"history:{ticker.upper()}:{range}"
        cached = await cache_get(cache_key)
        if cached:
            return HistoricalData.model_validate_json(cached)

        df = yf.download(ticker.upper(), period=period, interval=interval, progress=False)
        df.index = pd.to_datetime(df.index)

        bars = [
            OHLCVBar(
                timestamp=idx.to_pydatetime(),
                open=row["Open"],
                high=row["High"],
                low=row["Low"],
                close=row["Close"],
                volume=int(row["Volume"]),
            )
            for idx, row in df.iterrows()
        ]

        result = HistoricalData(ticker=ticker.upper(), range=range, interval=interval, data=bars)
        await cache_set(cache_key, result.model_dump_json(), ttl=settings.CACHE_TTL_HISTORY)
        return result

    async def get_fundamentals(self, ticker: str) -> Fundamentals:
        cache_key = f"fundamentals:{ticker.upper()}"
        cached = await cache_get(cache_key)
        if cached:
            return Fundamentals.model_validate_json(cached)

        info = yf.Ticker(ticker.upper()).info
        result = Fundamentals(
            ticker=ticker.upper(),
            sector=info.get("sector"),
            industry=info.get("industry"),
            pe_ratio=info.get("trailingPE"),
            forward_pe=info.get("forwardPE"),
            eps=info.get("trailingEps"),
            revenue=info.get("totalRevenue"),
            gross_margin=info.get("grossMargins"),
            operating_margin=info.get("operatingMargins"),
            roe=info.get("returnOnEquity"),
            debt_to_equity=info.get("debtToEquity"),
            free_cash_flow=info.get("freeCashflow"),
            dividend_yield=info.get("dividendYield"),
            beta=info.get("beta"),
        )
        await cache_set(cache_key, result.model_dump_json(), ttl=3600)
        return result


market_data_service = MarketDataService()
```

```python
# backend/app/services/indicators.py
import pandas as pd
import pandas_ta as ta
import numpy as np
from app.services.market_data import market_data_service


class IndicatorsService:

    async def get_all(self, ticker: str, range: str = "6M") -> dict:
        history = await market_data_service.get_history(ticker, range)
        df = pd.DataFrame([b.model_dump() for b in history.data])
        df.set_index("timestamp", inplace=True)
        df.rename(columns={"open": "Open", "high": "High", "low": "Low",
                            "close": "Close", "volume": "Volume"}, inplace=True)

        return {
            "rsi": self._rsi(df),
            "macd": self._macd(df),
            "bollinger": self._bollinger(df),
            "sma": self._sma(df),
            "ema": self._ema(df),
            "volatility": self._volatility(df),
        }

    def _rsi(self, df: pd.DataFrame, period: int = 14) -> list:
        rsi = ta.rsi(df["Close"], length=period)
        return self._series_to_list(rsi)

    def _macd(self, df: pd.DataFrame) -> dict:
        macd = ta.macd(df["Close"])
        return {
            "macd": self._series_to_list(macd["MACD_12_26_9"]),
            "signal": self._series_to_list(macd["MACDs_12_26_9"]),
            "histogram": self._series_to_list(macd["MACDh_12_26_9"]),
        }

    def _bollinger(self, df: pd.DataFrame, period: int = 20) -> dict:
        bb = ta.bbands(df["Close"], length=period)
        return {
            "upper": self._series_to_list(bb[f"BBU_{period}_2.0"]),
            "middle": self._series_to_list(bb[f"BBM_{period}_2.0"]),
            "lower": self._series_to_list(bb[f"BBL_{period}_2.0"]),
        }

    def _sma(self, df: pd.DataFrame) -> dict:
        return {
            "sma_20": self._series_to_list(ta.sma(df["Close"], length=20)),
            "sma_50": self._series_to_list(ta.sma(df["Close"], length=50)),
            "sma_200": self._series_to_list(ta.sma(df["Close"], length=200)),
        }

    def _ema(self, df: pd.DataFrame) -> dict:
        return {
            "ema_12": self._series_to_list(ta.ema(df["Close"], length=12)),
            "ema_26": self._series_to_list(ta.ema(df["Close"], length=26)),
        }

    def _volatility(self, df: pd.DataFrame) -> dict:
        returns = df["Close"].pct_change().dropna()
        rolling_vol = returns.rolling(30).std() * np.sqrt(252)
        sharpe = (returns.mean() * 252) / (returns.std() * np.sqrt(252))
        max_dd = self._max_drawdown(df["Close"])
        return {
            "rolling_volatility_30d": self._series_to_list(rolling_vol),
            "annualized_sharpe": round(float(sharpe), 4),
            "max_drawdown": round(float(max_dd), 4),
        }

    def _max_drawdown(self, prices: pd.Series) -> float:
        cumulative = (1 + prices.pct_change()).cumprod()
        rolling_max = cumulative.cummax()
        drawdown = (cumulative - rolling_max) / rolling_max
        return float(drawdown.min())

    def _series_to_list(self, series: pd.Series) -> list:
        return [
            {"timestamp": str(idx), "value": round(float(v), 4) if pd.notna(v) else None}
            for idx, v in series.items()
        ]


indicators_service = IndicatorsService()
```

```python
# backend/app/services/valuation.py
from app.schemas.stock import DCFInput, DCFResult
from app.services.market_data import market_data_service
import yfinance as yf


class ValuationService:

    async def dcf(self, ticker: str, inputs: DCFInput) -> DCFResult:
        info = yf.Ticker(ticker.upper()).info
        fcf = info.get("freeCashflow", 0)
        shares_outstanding = info.get("sharesOutstanding", 1)
        current_price = info.get("currentPrice", 0)

        # Use analyst revenue growth or fallback to historical avg
        growth_rate = inputs.revenue_growth_rate or info.get("revenueGrowth", 0.08)

        # Project FCF forward
        projected_fcf = []
        for year in range(1, inputs.projection_years + 1):
            projected_fcf.append(fcf * ((1 + growth_rate) ** year))

        # Discount to present value
        pv_fcf = sum(
            cf / ((1 + inputs.wacc) ** (i + 1))
            for i, cf in enumerate(projected_fcf)
        )

        # Terminal value (Gordon Growth Model)
        terminal_fcf = projected_fcf[-1] * (1 + inputs.terminal_growth_rate)
        terminal_value = terminal_fcf / (inputs.wacc - inputs.terminal_growth_rate)
        pv_terminal = terminal_value / ((1 + inputs.wacc) ** inputs.projection_years)

        intrinsic_value_total = pv_fcf + pv_terminal
        intrinsic_value_per_share = intrinsic_value_total / shares_outstanding
        margin_of_safety = (intrinsic_value_per_share - current_price) / intrinsic_value_per_share
        upside_pct = ((intrinsic_value_per_share - current_price) / current_price) * 100

        return DCFResult(
            ticker=ticker.upper(),
            intrinsic_value=round(intrinsic_value_per_share, 2),
            current_price=round(current_price, 2),
            margin_of_safety=round(margin_of_safety, 4),
            upside_pct=round(upside_pct, 2),
            assumptions=inputs,
        )


valuation_service = ValuationService()
```

### 5.6 API Routes

```python
# backend/app/api/v1/stocks.py
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Literal
from app.services.market_data import market_data_service
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

RangeType = Literal["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y"]


@router.get("/{ticker}/quote", summary="Get real-time stock quote")
async def get_quote(
    ticker: str,
    current_user: User = Depends(get_current_user),
):
    """
    Returns real-time bid/ask price, volume, market cap, and 52-week range.
    Cached in Redis for 60 seconds.
    """
    try:
        return await market_data_service.get_quote(ticker)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found: {str(e)}")


@router.get("/{ticker}/history", summary="Get OHLCV historical data")
async def get_history(
    ticker: str,
    range: RangeType = Query(default="1M"),
    current_user: User = Depends(get_current_user),
):
    return await market_data_service.get_history(ticker, range)


@router.get("/{ticker}/fundamentals", summary="Get fundamental metrics")
async def get_fundamentals(
    ticker: str,
    current_user: User = Depends(get_current_user),
):
    return await market_data_service.get_fundamentals(ticker)


@router.get("/compare", summary="Compare multiple tickers")
async def compare_tickers(
    tickers: str = Query(description="Comma-separated tickers: AAPL,MSFT,GOOGL"),
    current_user: User = Depends(get_current_user),
):
    ticker_list = [t.strip().upper() for t in tickers.split(",")][:8]  # max 8
    results = []
    for ticker in ticker_list:
        try:
            fundamentals = await market_data_service.get_fundamentals(ticker)
            quote = await market_data_service.get_quote(ticker)
            results.append({"ticker": ticker, "quote": quote, "fundamentals": fundamentals})
        except Exception:
            continue
    return {"comparison": results}
```

```python
# backend/app/api/v1/analytics.py
from fastapi import APIRouter, Depends
from app.services.indicators import indicators_service
from app.services.valuation import valuation_service
from app.schemas.stock import DCFInput
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/{ticker}/technicals", summary="Get all technical indicators")
async def get_technicals(
    ticker: str,
    range: str = "6M",
    current_user: User = Depends(get_current_user),
):
    return await indicators_service.get_all(ticker, range)


@router.post("/{ticker}/dcf", summary="Run DCF valuation model")
async def run_dcf(
    ticker: str,
    inputs: DCFInput,
    current_user: User = Depends(get_current_user),
):
    return await valuation_service.dcf(ticker, inputs)
```

### 5.7 WebSocket Live Feed

```python
# backend/app/api/v1/ws.py
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.market_data import market_data_service
from app.core.security import verify_ws_token

router = APIRouter()


class ConnectionManager:
    """
    Manages active WebSocket connections per ticker.
    Uses a dict[ticker -> set[WebSocket]] for pub/sub-style broadcasting.
    """

    def __init__(self):
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, ticker: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(ticker.upper(), set()).add(websocket)

    def disconnect(self, ticker: str, websocket: WebSocket):
        ticker = ticker.upper()
        if ticker in self.active:
            self.active[ticker].discard(websocket)
            if not self.active[ticker]:
                del self.active[ticker]

    async def broadcast(self, ticker: str, data: dict):
        ticker = ticker.upper()
        if ticker not in self.active:
            return
        dead = set()
        for ws in self.active[ticker]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active[ticker].discard(ws)


manager = ConnectionManager()


@router.websocket("/stocks/{ticker}")
async def stock_live_feed(websocket: WebSocket, ticker: str, token: str = ""):
    """
    WebSocket endpoint that streams live price data every 5 seconds.

    Connect: ws://localhost:8000/ws/stocks/AAPL?token=<jwt>

    Message format:
    {
        "ticker": "AAPL",
        "price": 227.43,
        "change": 1.23,
        "change_pct": 0.54,
        "volume": 34521000,
        "timestamp": "2024-09-01T14:32:00Z"
    }
    """
    # Verify JWT from query param (WS can't use headers in browser)
    if not await verify_ws_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(ticker, websocket)

    try:
        while True:
            try:
                quote = await market_data_service.get_quote(ticker)
                await manager.broadcast(
                    ticker,
                    {
                        "type": "price_update",
                        "ticker": quote.ticker,
                        "price": quote.price,
                        "change": quote.change,
                        "change_pct": quote.change_pct,
                        "volume": quote.volume,
                        "timestamp": quote.timestamp.isoformat(),
                    },
                )
            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})

            # Poll interval — 5s for free data, sub-second for paid feeds
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        manager.disconnect(ticker, websocket)
```

### 5.8 Authentication

```python
# backend/app/core/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    expires = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expires}, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    # Fetch from DB (omitted for brevity — use AsyncSession + SQLAlchemy)
    return user_id


async def verify_ws_token(token: str) -> bool:
    try:
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return True
    except JWTError:
        return False
```

### 5.9 Caching Strategy

```python
# backend/app/core/cache.py
import json
from typing import Optional
import aioredis
from app.core.config import settings

_redis: Optional[aioredis.Redis] = None


async def init_cache():
    global _redis
    _redis = await aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)


async def cache_get(key: str) -> Optional[str]:
    if _redis is None:
        return None
    return await _redis.get(key)


async def cache_set(key: str, value: str, ttl: int = 60):
    if _redis is None:
        return
    await _redis.setex(key, ttl, value)


async def cache_delete(key: str):
    if _redis is None:
        return
    await _redis.delete(key)


async def cache_invalidate_pattern(pattern: str):
    """Use sparingly — SCAN not KEYS to avoid blocking Redis."""
    if _redis is None:
        return
    async for key in _redis.scan_iter(match=pattern):
        await _redis.delete(key)
```

**Cache TTL Strategy:**

| Data Type | TTL | Reasoning |
|---|---|---|
| Live quote | 60s | Near-real-time, rate-limit safe |
| Historical OHLCV | 1 hour | Intraday doesn't change past data |
| Fundamentals | 24 hours | Changes quarterly |
| DCF result | 1 hour | Derived from fundamentals |
| News sentiment | 15 minutes | Fresh headlines matter |

### 5.10 Background Tasks

```python
# backend/app/tasks/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "stock_analyzer",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.price_alerts", "app.tasks.cache_warmup"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-price-alerts-every-minute": {
            "task": "app.tasks.price_alerts.check_all_alerts",
            "schedule": 60.0,
        },
        "warm-cache-every-hour": {
            "task": "app.tasks.cache_warmup.warm_popular_tickers",
            "schedule": 3600.0,
        },
    },
)
```

### 5.11 Error Handling

```python
# backend/app/core/exceptions.py
from fastapi import Request
from fastapi.responses import JSONResponse


class StockNotFoundError(Exception):
    def __init__(self, ticker: str):
        self.ticker = ticker


class ExternalAPIError(Exception):
    def __init__(self, provider: str, detail: str):
        self.provider = provider
        self.detail = detail


# Register in main.py:
# app.add_exception_handler(StockNotFoundError, stock_not_found_handler)

async def stock_not_found_handler(request: Request, exc: StockNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": "STOCK_NOT_FOUND",
            "message": f"Ticker '{exc.ticker}' was not found or is delisted.",
            "ticker": exc.ticker,
        },
    )


async def external_api_error_handler(request: Request, exc: ExternalAPIError):
    return JSONResponse(
        status_code=503,
        content={
            "error": "EXTERNAL_API_ERROR",
            "provider": exc.provider,
            "message": exc.detail,
        },
    )
```

### 5.12 Middleware

```python
# backend/app/middleware/timing.py
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
        return response
```

---

## 6. Frontend — React

### 6.1 Project Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Install all dependencies from package.json above
npm install react-router-dom axios @tanstack/react-query zustand \
  recharts lightweight-charts date-fns lucide-react clsx \
  tailwind-merge react-hot-toast react-hook-form zod @hookform/resolvers

# Setup Tailwind
npx tailwindcss init -p
```

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
});
```

### 6.2 Folder Structure

See [Section 3 — Full Directory Structure](#3-full-directory-structure) for the complete frontend tree.

### 6.3 State Management

```typescript
// frontend/src/store/liveDataStore.ts
import { create } from "zustand";

interface PriceUpdate {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  timestamp: string;
}

interface LiveDataStore {
  prices: Record<string, PriceUpdate>;
  updatePrice: (update: PriceUpdate) => void;
  subscribedTickers: Set<string>;
  addSubscription: (ticker: string) => void;
  removeSubscription: (ticker: string) => void;
}

export const useLiveDataStore = create<LiveDataStore>((set) => ({
  prices: {},
  subscribedTickers: new Set(),
  updatePrice: (update) =>
    set((state) => ({
      prices: { ...state.prices, [update.ticker]: update },
    })),
  addSubscription: (ticker) =>
    set((state) => ({
      subscribedTickers: new Set([...state.subscribedTickers, ticker]),
    })),
  removeSubscription: (ticker) =>
    set((state) => {
      const next = new Set(state.subscribedTickers);
      next.delete(ticker);
      return { subscribedTickers: next };
    }),
}));
```

### 6.4 Core Components

```typescript
// frontend/src/components/stock/QuoteCard.tsx
import { useLiveDataStore } from "@/store/liveDataStore";
import { cn } from "@/utils/formatters";

interface QuoteCardProps {
  ticker: string;
  initialPrice: number;
}

export function QuoteCard({ ticker, initialPrice }: QuoteCardProps) {
  const liveData = useLiveDataStore((state) => state.prices[ticker]);
  const price = liveData?.price ?? initialPrice;
  const changePct = liveData?.change_pct ?? 0;
  const isPositive = changePct >= 0;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{ticker}</span>
        <span
          className={cn(
            "text-sm font-medium px-2 py-0.5 rounded-full",
            isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}
        >
          {isPositive ? "+" : ""}{changePct.toFixed(2)}%
        </span>
      </div>
      <p className="mt-2 text-3xl font-mono font-semibold">
        ${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
```

### 6.5 Pages

```typescript
// frontend/src/pages/StockDetail.tsx
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchQuote, fetchHistory, fetchTechnicals } from "@/api/stocks";
import { QuoteCard } from "@/components/stock/QuoteCard";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { IndicatorChart } from "@/components/charts/IndicatorChart";
import { FundamentalsTable } from "@/components/stock/FundamentalsTable";
import { NewsPanel } from "@/components/stock/NewsPanel";
import { useWebSocket } from "@/hooks/useWebSocket";

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();

  // Subscribe to live WebSocket feed for this ticker
  useWebSocket(ticker!);

  const { data: quote } = useQuery({
    queryKey: ["quote", ticker],
    queryFn: () => fetchQuote(ticker!),
    refetchInterval: 30_000,   // Fallback poll — WS handles real-time
  });

  const { data: history } = useQuery({
    queryKey: ["history", ticker, "3M"],
    queryFn: () => fetchHistory(ticker!, "3M"),
  });

  const { data: technicals } = useQuery({
    queryKey: ["technicals", ticker],
    queryFn: () => fetchTechnicals(ticker!),
  });

  if (!quote) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      <div className="col-span-12">
        <QuoteCard ticker={ticker!} initialPrice={quote.price} />
      </div>
      <div className="col-span-8">
        <CandlestickChart data={history?.data ?? []} />
      </div>
      <div className="col-span-4">
        <FundamentalsTable ticker={ticker!} />
      </div>
      <div className="col-span-8">
        <IndicatorChart rsi={technicals?.rsi} macd={technicals?.macd} />
      </div>
      <div className="col-span-4">
        <NewsPanel ticker={ticker!} />
      </div>
    </div>
  );
}
```

### 6.6 WebSocket Integration

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef } from "react";
import { useLiveDataStore } from "@/store/liveDataStore";
import { useAuthStore } from "@/store/authStore";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export function useWebSocket(ticker: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { token } = useAuthStore();
  const { updatePrice, addSubscription, removeSubscription } = useLiveDataStore();

  useEffect(() => {
    if (!ticker || !token) return;
    addSubscription(ticker);

    const connect = () => {
      wsRef.current = new WebSocket(`${WS_BASE}/stocks/${ticker}?token=${token}`);

      wsRef.current.onopen = () => {
        console.log(`[WS] Connected to ${ticker}`);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "price_update") {
            updatePrice(data);
          }
        } catch (e) {
          console.error("[WS] Parse error:", e);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error("[WS] Error:", err);
      };

      wsRef.current.onclose = (event) => {
        if (!event.wasClean) {
          // Exponential backoff reconnect
          reconnectTimeout.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close(1000, "Component unmounted");
      removeSubscription(ticker);
    };
  }, [ticker, token]);
}
```

### 6.7 API Layer

```typescript
// frontend/src/api/client.ts
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

```typescript
// frontend/src/api/stocks.ts
import { apiClient } from "./client";
import type { StockQuote, HistoricalData, Fundamentals } from "@/types/stock";

export const fetchQuote = async (ticker: string): Promise<StockQuote> => {
  const { data } = await apiClient.get(`/stocks/${ticker}/quote`);
  return data;
};

export const fetchHistory = async (
  ticker: string,
  range: string = "1M"
): Promise<HistoricalData> => {
  const { data } = await apiClient.get(`/stocks/${ticker}/history`, {
    params: { range },
  });
  return data;
};

export const fetchTechnicals = async (ticker: string) => {
  const { data } = await apiClient.get(`/analytics/${ticker}/technicals`);
  return data;
};

export const fetchFundamentals = async (ticker: string): Promise<Fundamentals> => {
  const { data } = await apiClient.get(`/stocks/${ticker}/fundamentals`);
  return data;
};

export const runDCF = async (
  ticker: string,
  params: { wacc: number; terminal_growth_rate: number; projection_years: number }
) => {
  const { data } = await apiClient.post(`/analytics/${ticker}/dcf`, params);
  return data;
};
```

### 6.8 Charts & Visualizations

```typescript
// frontend/src/components/charts/CandlestickChart.tsx
// Uses lightweight-charts (TradingView) — best-in-class candlestick performance
import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { OHLCVBar } from "@/types/stock";

interface Props {
  data: OHLCVBar[];
}

export function CandlestickChart({ data }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      width: chartRef.current.clientWidth,
      height: 400,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeries.setData(
      data.map((bar) => ({
        time: bar.timestamp.split("T")[0] as any,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => chart.applyOptions({ width: chartRef.current!.clientWidth });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={chartRef} className="w-full rounded-lg overflow-hidden" />;
}
```

---

## 7. Feature Implementation Guide

### Backtesting Engine

```python
# backend/app/services/backtesting.py
import pandas as pd
from dataclasses import dataclass
from app.services.market_data import market_data_service


@dataclass
class BacktestResult:
    total_return: float
    annualized_return: float
    max_drawdown: float
    sharpe_ratio: float
    num_trades: int
    win_rate: float
    signals: list


class BacktestingService:

    async def ma_crossover(
        self,
        ticker: str,
        fast_period: int = 20,
        slow_period: int = 50,
        range: str = "2Y",
    ) -> BacktestResult:
        history = await market_data_service.get_history(ticker, range)
        df = pd.DataFrame([b.model_dump() for b in history.data])
        df["fast_ma"] = df["close"].rolling(fast_period).mean()
        df["slow_ma"] = df["close"].rolling(slow_period).mean()

        # Generate signals: 1 = buy, -1 = sell
        df["signal"] = 0
        df.loc[df["fast_ma"] > df["slow_ma"], "signal"] = 1
        df.loc[df["fast_ma"] <= df["slow_ma"], "signal"] = -1
        df["position"] = df["signal"].diff()

        # Calculate strategy returns
        df["returns"] = df["close"].pct_change()
        df["strategy_returns"] = df["returns"] * df["signal"].shift(1)
        df.dropna(inplace=True)

        total_return = (df["strategy_returns"] + 1).prod() - 1
        annualized = (1 + total_return) ** (252 / len(df)) - 1
        sharpe = df["strategy_returns"].mean() / df["strategy_returns"].std() * (252 ** 0.5)

        trades = df[df["position"] != 0]
        wins = len(trades[trades["strategy_returns"] > 0])

        return BacktestResult(
            total_return=round(float(total_return), 4),
            annualized_return=round(float(annualized), 4),
            max_drawdown=self._max_drawdown(df["strategy_returns"]),
            sharpe_ratio=round(float(sharpe), 4),
            num_trades=len(trades),
            win_rate=round(wins / len(trades) if len(trades) > 0 else 0, 4),
            signals=df[["timestamp", "close", "fast_ma", "slow_ma", "signal"]].to_dict("records"),
        )

    def _max_drawdown(self, returns: pd.Series) -> float:
        cumulative = (1 + returns).cumprod()
        rolling_max = cumulative.cummax()
        drawdown = (cumulative - rolling_max) / rolling_max
        return round(float(drawdown.min()), 4)
```

### News Sentiment

```python
# backend/app/services/sentiment.py
from textblob import TextBlob
from newsapi import NewsApiClient
from datetime import datetime, timedelta
from app.core.config import settings
from app.schemas.stock import NewsItem


class SentimentService:

    def __init__(self):
        self.client = NewsApiClient(api_key=settings.NEWS_API_KEY)

    async def get_news_with_sentiment(self, ticker: str) -> list[NewsItem]:
        from_date = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        response = self.client.get_everything(
            q=ticker, from_param=from_date, language="en", sort_by="publishedAt", page_size=10
        )

        results = []
        for article in response.get("articles", []):
            text = f"{article['title']} {article.get('description', '')}"
            blob = TextBlob(text)
            score = blob.sentiment.polarity

            results.append(
                NewsItem(
                    title=article["title"],
                    source=article["source"]["name"],
                    url=article["url"],
                    published_at=datetime.fromisoformat(article["publishedAt"].replace("Z", "+00:00")),
                    sentiment_score=round(score, 4),
                    sentiment_label=(
                        "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"
                    ),
                )
            )
        return results


sentiment_service = SentimentService()
```

---

## 8. WebSocket Live Feed — Deep Dive

### Architecture Decision

The system uses a **single WebSocket connection per ticker per client** pattern. The `ConnectionManager` on the server holds open connections and a Celery-backed price polling loop pushes updates. For production, this scales via Redis Pub/Sub:

```
Client A ──┐
Client B ──┼── WebSocket ──► FastAPI Worker 1 ──► Subscribe: AAPL channel
Client C ──┘                                          │
                                                       ▼
                                              Redis Pub/Sub Channel: "price:AAPL"
                                                       ▲
                                              Celery worker (price poller)
                                              publishes every 5s
```

### Redis Pub/Sub for Multi-Worker Scaling

```python
# backend/app/api/v1/ws.py (production pattern)
import asyncio
import aioredis
from fastapi import WebSocket, WebSocketDisconnect

async def stock_live_feed_scaled(websocket: WebSocket, ticker: str):
    await websocket.accept()
    redis = await aioredis.from_url(settings.REDIS_URL)
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"price:{ticker.upper()}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        await pubsub.unsubscribe(f"price:{ticker.upper()}")
    finally:
        await redis.close()
```

### Client Reconnect Strategy

The frontend `useWebSocket` hook implements **exponential backoff** reconnection:

```typescript
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // ms

const connect = (attempt = 0) => {
  const ws = new WebSocket(`${WS_BASE}/stocks/${ticker}?token=${token}`);
  ws.onclose = (e) => {
    if (!e.wasClean) {
      const delay = BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];
      setTimeout(() => connect(attempt + 1), delay);
    }
  };
};
```

### WebSocket Message Protocol

| Message Type | Direction | Payload |
|---|---|---|
| `price_update` | Server → Client | price, change_pct, volume, timestamp |
| `subscribe` | Client → Server | ticker, token |
| `unsubscribe` | Client → Server | ticker |
| `error` | Server → Client | message, code |
| `heartbeat` | Server → Client | timestamp (every 30s) |

---

## 9. Code Quality & Best Practices

### Backend

**1. Always use async/await for I/O — never block the event loop:**
```python
# ❌ WRONG — blocks event loop
import time
time.sleep(1)

# ✅ CORRECT
import asyncio
await asyncio.sleep(1)
```

**2. Use Pydantic v2 model validation, not raw dicts:**
```python
# ❌ WRONG
return {"ticker": ticker, "price": 100}

# ✅ CORRECT
return StockQuote(ticker=ticker, price=100, ...)
```

**3. Never hardcode secrets — always use Pydantic Settings:**
```python
# ❌ WRONG
API_KEY = "abc123"

# ✅ CORRECT
from app.core.config import settings
api_key = settings.ALPHA_VANTAGE_KEY
```

**4. Use dependency injection for shared resources:**
```python
# ❌ WRONG — instantiating in route handler
@router.get("/quote")
async def get_quote(ticker: str):
    service = MarketDataService()  # new instance every request

# ✅ CORRECT — singleton at module level, injected
market_data_service = MarketDataService()

@router.get("/quote")
async def get_quote(
    ticker: str,
    service: MarketDataService = Depends(lambda: market_data_service)
):
```

**5. Structured logging over print statements:**
```python
import structlog
log = structlog.get_logger()

log.info("quote_fetched", ticker=ticker, price=quote.price, cache_hit=False)
```

**6. Always add retry logic for external APIs:**
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
async def fetch_from_yfinance(ticker: str): ...
```

**7. Use Alembic migrations — never `create_all()` in production:**
```bash
alembic revision --autogenerate -m "add holdings table"
alembic upgrade head
```

### Frontend

**8. Colocate queries with components using TanStack Query:**
```typescript
// ✅ CORRECT — query lives with the component that needs it
const { data, isLoading, error } = useQuery({
  queryKey: ["quote", ticker],
  queryFn: () => fetchQuote(ticker),
  staleTime: 30_000,       // Don't refetch if data is <30s old
  gcTime: 5 * 60_000,      // Keep in cache for 5 min after unmount
});
```

**9. Type everything with TypeScript — no `any`:**
```typescript
// ❌ WRONG
const handleData = (data: any) => { ... }

// ✅ CORRECT
const handleData = (data: StockQuote) => { ... }
```

**10. Clean up WebSocket connections on unmount:**
```typescript
useEffect(() => {
  const ws = new WebSocket(url);
  return () => ws.close(1000, "Component unmounted");  // Always clean up
}, []);
```

**11. Memoize expensive chart computations:**
```typescript
const chartData = useMemo(
  () => history?.data.map(transformForChart) ?? [],
  [history?.data]
);
```

**12. Centralize API error handling in the Axios interceptor — never in components.**

**13. Separate business logic from UI — never fetch in components directly:**
```typescript
// ❌ WRONG — fetch inside component
const [data, setData] = useState(null);
useEffect(() => { fetch("/api/quote").then(...); }, []);

// ✅ CORRECT — use hook
const { data } = useStockQuote(ticker);
```

---

## 10. Docker & Deployment

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: stockdb
      POSTGRES_USER: stockuser
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stockuser -d stockdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  celery_worker:
    build: ./backend
    command: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=4
    volumes:
      - ./backend:/app
    env_file: ./backend/.env
    depends_on:
      - backend
      - redis

  celery_beat:
    build: ./backend
    command: celery -A app.tasks.celery_app beat --loglevel=info
    volumes:
      - ./backend:/app
    env_file: ./backend/.env
    depends_on:
      - celery_worker

  flower:
    build: ./backend
    command: celery -A app.tasks.celery_app flower --port=5555
    ports:
      - "5555:5555"
    depends_on:
      - celery_worker

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000/api/v1
      - VITE_WS_URL=ws://localhost:8000/ws

volumes:
  postgres_data:
  redis_data:
```

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

---

## 11. Testing Strategy

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    # Register and login to get token
    await client.post("/api/v1/auth/register", json={
        "email": "test@test.com", "username": "tester", "password": "Test1234!"
    })
    res = await client.post("/api/v1/auth/login", data={
        "username": "test@test.com", "password": "Test1234!"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

```python
# backend/tests/test_stocks.py
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_quote_success(client: AsyncClient, auth_headers):
    with patch("app.services.market_data.MarketDataService.get_quote", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "ticker": "AAPL", "price": 227.50, "change": 1.20,
            "change_pct": 0.53, "volume": 45000000,
        }
        response = await client.get("/api/v1/stocks/AAPL/quote", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["ticker"] == "AAPL"


@pytest.mark.asyncio
async def test_get_quote_invalid_ticker(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/stocks/INVALIDXXX/quote", headers=auth_headers)
    assert response.status_code == 404
```

```typescript
// frontend/src/hooks/useWebSocket.test.ts
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "./useWebSocket";

describe("useWebSocket", () => {
  it("connects on mount and disconnects on unmount", () => {
    const mockWs = { close: vi.fn(), onopen: null, onmessage: null };
    global.WebSocket = vi.fn(() => mockWs) as any;

    const { unmount } = renderHook(() => useWebSocket("AAPL"));
    expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining("AAPL"));

    unmount();
    expect(mockWs.close).toHaveBeenCalledWith(1000, "Component unmounted");
  });
});
```

---

## 12. Interview Talking Points

| Question | Answer to Prepare |
|---|---|
| **Why FastAPI over Django/Flask?** | Native async support, Pydantic v2 automatic validation, auto-generated OpenAPI docs, WebSocket support built-in |
| **How does your caching work?** | TTL-based Redis. Quotes: 60s. Fundamentals: 24h. Cache invalidated on portfolio CRUD. Pattern-based invalidation for user-specific data |
| **How would you scale the WebSocket feed?** | Replace in-memory `ConnectionManager` with Redis Pub/Sub. Each FastAPI worker subscribes to the relevant channel. Celery publishes updates |
| **What's your DB schema design?** | Normalized: users → portfolios → holdings. Tickers are not entities — they're strings. Price history is stateless (fetched live, cached) |
| **How do you handle external API failures?** | `tenacity` retry with exponential backoff (3 attempts). Circuit breaker pattern for sustained failures. Stale cache fallback |
| **What's your auth strategy?** | Short-lived JWT (30min) + refresh token (7d). WebSocket auth via token query param since browser WS API can't set headers |
| **How did you design the DCF model?** | Simple 2-stage DCF: project FCF for N years using analyst/historical growth, terminal value via Gordon Growth. Parameterized WACC and g for sensitivity analysis |
| **What would you add next?** | Real-time order book from exchange WebSocket feeds, FinBERT for better NLP sentiment, portfolio optimization (Markowitz), alpha factor model |

---

## 13. Step-by-Step Build Order

Follow this sequence to avoid dependency issues:

```
Week 1 — Foundation
  [x] 1. FastAPI scaffold + docker-compose.yml
  [x] 2. Pydantic settings + .env setup
  [x] 3. SQLAlchemy async engine + Alembic init
  [x] 4. User model + auth endpoints (register, login)
  [x] 5. Redis cache module
  [x] 6. MarketDataService (quote + history)
  [x] 7. /stocks routes + JWT middleware

Week 2 — Core Analytics
  [x] 8. IndicatorsService (RSI, MACD, BB, SMA, EMA)
  [x] 9. FundamentalsService
  [x] 10. Portfolio + Holding models + CRUD endpoints
  [x] 11. P&L calculation in PortfolioService
  [x] 12. DCF ValuationService

Week 3 — Advanced Features
  [x] 13. SentimentService (NewsAPI + TextBlob)
  [x] 14. BacktestingService (MA crossover)
  [x] 15. Celery worker + beat scheduler
  [x] 16. PriceAlert model + check_alerts task
  [x] 17. WebSocket ConnectionManager + /ws/stocks route

Week 4 — Frontend
  [x] 18. Vite + React + TypeScript scaffold
  [x] 19. Tailwind + component library setup
  [x] 20. Axios client + TanStack Query setup
  [x] 21. Zustand stores (auth, live data)
  [x] 22. Login page + auth flow
  [x] 23. Dashboard page + QuoteCard components
  [x] 24. CandlestickChart (lightweight-charts)
  [x] 25. useWebSocket hook + live price updates
  [x] 26. StockDetail page (charts + indicators + news)
  [x] 27. Portfolio page + P&L table
  [x] 28. DCF calculator UI

Week 5 — Polish
  [x] 29. Error boundaries + toast notifications
  [x] 30. pytest suite for all backend routes
  [x] 31. Frontend vitest unit tests for hooks
  [x] 32. Rate limiting (slowapi) + structured logging
  [x] 33. Production docker-compose.prod.yml
  [x] 34. README with architecture diagram + setup instructions
```

---

*Built for Morgan Stanley & JPMorgan equities technology interviews.*
*Stack: FastAPI · React · PostgreSQL · Redis · Celery · WebSockets*