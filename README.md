# 📈 Stock Analyzer

A full-stack, production-grade stock analysis platform built for equities interviews — replicating the core toolkit of an equities desk.

**Stack:** FastAPI · React 18 · PostgreSQL 16 · Redis 7 · Celery · WebSockets · TypeScript · Tailwind CSS

---

## Features

| Feature | Status | 
|---|---|
| Real-time WebSocket price feed | Scaffolded |
| Historical OHLCV charts | Scaffolded |
| Technical indicators (RSI, MACD, BB, SMA, EMA) | Scaffolded |
| Fundamental metrics & DCF valuation | Scaffolded |
| Portfolio tracker with P&L | Scaffolded |
| News sentiment | Scaffolded |
| MA crossover backtesting | Scaffolded |
| JWT authentication | Scaffolded |

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (for DB/Redis)

---

### 1. Backend

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux
# Edit .env and set SECRET_KEY and DATABASE_URL

# Start required services (PostgreSQL + Redis)
docker-compose up -d db redis

# Run Alembic migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload
```

**API docs:** http://localhost:8000/api/docs

---

### 2. Frontend

```bash
cd frontend

# Copy env and install (already installed if using git clone of this scaffold)
copy .env.example .env      # Windows
npm install
npm run dev
```

**Frontend:** http://localhost:5173

---

### 3. Full Stack with Docker Compose

```bash
# From project root — starts all services
docker-compose up --build

# Services:
#   Backend API   → http://localhost:8000/api/docs
#   Frontend      → http://localhost:5173
#   Flower UI     → http://localhost:5555
#   PostgreSQL    → localhost:5432
#   Redis         → localhost:6379
```

---

## Project Structure

```
stock_A/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── main.py        # App factory + lifespan
│   │   ├── core/          # Config, DB, cache, security, exceptions
│   │   ├── api/v1/        # REST + WebSocket routes
│   │   ├── services/      # Business logic layer
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── tasks/         # Celery tasks
│   │   └── middleware/    # Logging, timing
│   ├── migrations/        # Alembic migrations
│   ├── tests/             # pytest suite
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/              # React + Vite + TypeScript
│   └── src/
│       ├── api/           # Axios call functions
│       ├── store/         # Zustand state (auth, live data, watchlist)
│       ├── hooks/         # TanStack Query + WebSocket hooks
│       ├── pages/         # Route-level pages
│       ├── types/         # TypeScript types
│       └── utils/         # Formatters, constants
│
├── docker-compose.yml
└── README.md
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | JWT signing key (min 32 chars) |
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | ✅ | `redis://localhost:6379/0` |
| `NEWS_API_KEY` | Optional | For news sentiment feature |
| `ALPHA_VANTAGE_KEY` | Optional | For premium data |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | FastAPI base URL |
| `VITE_WS_URL` | WebSocket base URL |

---

## Development Workflow

After scaffolding, implement features in this order (see `requirements.md` for full spec):

1. `MarketDataService` → yfinance integration
2. Auth endpoints (register + login)
3. `IndicatorsService` → pandas-ta
4. Portfolio CRUD + P&L
5. DCF ValuationService
6. SentimentService → NewsAPI + TextBlob
7. WebSocket live feed (complete ConnectionManager)
8. Frontend components → QuoteCard, CandlestickChart, etc.

---

*Built for Morgan Stanley & JPMorgan equities technology interviews.*
