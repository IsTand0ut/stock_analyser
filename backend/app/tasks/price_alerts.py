"""Celery tasks for price alerts and cache warming."""
import asyncio
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.tasks.celery_app import celery_app
from app.core.database import async_session_factory
from app.models.alert import PriceAlert
from app.services.market_data import market_data_service
import structlog

log = structlog.get_logger()

async def _check_alerts_logic():
    """Logic to check all active alerts."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(PriceAlert).where(PriceAlert.is_active == True)
        )
        alerts = result.scalars().all()
        
        for alert in alerts:
            try:
                quote = await market_data_service.get_quote(alert.ticker)
                current_price = quote.price
                
                triggered = False
                if alert.direction == "up" and current_price >= alert.target_price:
                    triggered = True
                elif alert.direction == "down" and current_price <= alert.target_price:
                    triggered = True
                
                if triggered:
                    log.info("alert_triggered", ticker=alert.ticker, target=alert.target_price, current=current_price)
                    alert.is_active = False
                    alert.triggered_at = datetime.utcnow()
                    await db.commit()
                    # In a real app, you'd send an email/push/websocket here
            except Exception as e:
                log.error("alert_check_error", ticker=alert.ticker, error=str(e))

@celery_app.task
def check_alerts():
    """Celery wrapper for alert checking."""
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_check_alerts_logic())

@celery_app.task
def warm_cache():
    """Warms the market data cache for popular tickers."""
    # Logic to fetch data for top 50 tickers to keep cache fresh
    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "BRK-B", "META", "UNH", "V"]
    
    async def _warm():
        for t in tickers:
            try:
                await market_data_service.get_quote(t)
                await market_data_service.get_history(t, "1D")
            except Exception:
                pass
                
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_warm())
