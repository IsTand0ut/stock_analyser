"""WebSocket endpoint: /api/v1/ws/stocks/{ticker}"""
import asyncio
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import verify_ws_token
from app.services.market_data import market_data_service

router = APIRouter()


class ConnectionManager:
    """
    Manages active WebSocket connections keyed by ticker.
    Each ticker maps to a set of connected WebSocket clients,
    enabling pub/sub-style broadcasting.
    """

    def __init__(self):
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, ticker: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.setdefault(ticker.upper(), set()).add(websocket)

    def disconnect(self, ticker: str, websocket: WebSocket) -> None:
        t = ticker.upper()
        if t in self.active:
            self.active[t].discard(websocket)
            if not self.active[t]:
                del self.active[t]

    async def broadcast(self, ticker: str, data: dict) -> None:
        t = ticker.upper()
        if t not in self.active:
            return
        dead: set[WebSocket] = set()
        for ws in self.active[t]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active[t].discard(ws)


manager = ConnectionManager()


@router.websocket("/stocks/{ticker}")
async def stock_live_feed(websocket: WebSocket, ticker: str, token: str = ""):
    """
    Streams live price ticks every 5 seconds.

    Connect: ws://localhost:8000/api/v1/ws/stocks/AAPL?token=<jwt>

    Message types:
      - price_update  { ticker, price, change, change_pct, volume, timestamp }
      - error         { message }
      - heartbeat     { timestamp }
    """
    if token and not await verify_ws_token(token):
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
                await manager.broadcast(
                    ticker,
                    {
                        "type": "error",
                        "message": str(e),
                    },
                )
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        manager.disconnect(ticker, websocket)
