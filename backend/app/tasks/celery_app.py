"""Celery application configuration."""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "stock_analyzer",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

# Task imports (to be registered)
import app.tasks.price_alerts  # noqa

# Beat Schedule
celery_app.conf.beat_schedule = {
    "check-price-alerts-every-60s": {
        "task": "app.tasks.price_alerts.check_alerts",
        "schedule": 60.0,
    },
    "warm-market-data-cache-every-hour": {
        "task": "app.tasks.price_alerts.warm_cache",
        "schedule": crontab(minute=0, hour="*"),
    },
}
