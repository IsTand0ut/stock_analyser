"""Periodic task: pre-warm Redis cache for popular tickers."""
import structlog
from app.tasks.celery_app import celery_app

log = structlog.get_logger()

POPULAR_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "JPM", "GS", "MS",
]


@celery_app.task(name="app.tasks.cache_warmup.warm_popular_tickers")
def warm_popular_tickers():
    """
    Runs every hour via Celery Beat.
    Pre-fetches quotes for popular tickers to minimize cold-cache latency.
    TODO: implement with async runner + MarketDataService.
    """
    log.info("warm_popular_tickers_stub", tickers=POPULAR_TICKERS)
