"""WebSocket endpoint: /api/v1/ws/stocks/{ticker}"""
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import verify_ws_token

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
    if not await verify_ws_token(token):
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(ticker, websocket)

    try:
        while True:
            # TODO: replace stub with MarketDataService.get_quote()
            await manager.broadcast(
                ticker,
                {
                    "type": "price_update",
                    "ticker": ticker.upper(),
                    "price": 0.0,
                    "change": 0.0,
                    "change_pct": 0.0,
                    "volume": 0,
                    "timestamp": "stub",
                },
            )
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        manager.disconnect(ticker, websocket)
