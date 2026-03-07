from fastapi import APIRouter

from app.api.v1 import auth, stocks, portfolio, analytics, alerts, ws

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
