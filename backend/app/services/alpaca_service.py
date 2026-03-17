"""
Alpaca paper trading service.
Wraps the alpaca-py SDK to make it friendlier for our async FastAPI routes.
All methods run the synchronous Alpaca SDK calls in a thread pool via asyncio.to_thread().
"""
import asyncio
from typing import Any, Dict, List, Optional

import structlog
from fastapi import HTTPException

from app.core.config import settings

log = structlog.get_logger()

# ── Lazy-initialised client (only needs keys to be present) ─────────────────

def _make_client():
    try:
        from alpaca.trading.client import TradingClient  # type: ignore
        if not settings.ALPACA_API_KEY or not settings.ALPACA_SECRET_KEY:
            return None
        return TradingClient(
            api_key=settings.ALPACA_API_KEY,
            secret_key=settings.ALPACA_SECRET_KEY,
            paper=True,
        )
    except Exception as e:
        log.warning("alpaca_client_init_failed", error=str(e))
        return None


class AlpacaService:
    """Async wrapper around the Alpaca-py TradingClient."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = _make_client()
        return self._client

    def _require_client(self):
        if self.client is None:
            raise HTTPException(
                status_code=503,
                detail="Alpaca API keys not configured. Add ALPACA_API_KEY and ALPACA_SECRET_KEY to .env",
            )
        return self.client

    # ─── Account ────────────────────────────────────────────────────────────

    async def get_account(self) -> Dict[str, Any]:
        client = self._require_client()

        def _fetch():
            from alpaca.trading.requests import GetPortfolioHistoryRequest  # type: ignore
            acct = client.get_account()
            return {
                "buying_power":       float(acct.buying_power),
                "cash":               float(acct.cash),
                "portfolio_value":    float(acct.portfolio_value),
                "equity":             float(acct.equity),
                "last_equity":        float(acct.last_equity),
                "day_pnl":            float(acct.equity) - float(acct.last_equity),
                "day_pnl_pct":        ((float(acct.equity) - float(acct.last_equity)) / float(acct.last_equity) * 100)
                                      if float(acct.last_equity) else 0.0,
                "day_trade_count":    int(acct.daytrade_count),
                "pattern_day_trader": acct.pattern_day_trader,
                "account_status":     str(acct.status),
                "currency":           acct.currency,
            }

        try:
            return await asyncio.to_thread(_fetch)
        except HTTPException:
            raise
        except Exception as e:
            log.error("alpaca_get_account_error", error=str(e))
            raise HTTPException(status_code=502, detail=f"Alpaca error: {e}")

    # ─── Positions ──────────────────────────────────────────────────────────

    async def get_positions(self) -> List[Dict[str, Any]]:
        client = self._require_client()

        def _fetch():
            positions = client.get_all_positions()
            return [
                {
                    "symbol":            p.symbol,
                    "qty":               float(p.qty),
                    "side":              str(p.side.value),
                    "avg_entry_price":   float(p.avg_entry_price),
                    "current_price":     float(p.current_price) if p.current_price else None,
                    "market_value":      float(p.market_value) if p.market_value else None,
                    "unrealized_pl":     float(p.unrealized_pl) if p.unrealized_pl else None,
                    "unrealized_plpc":   float(p.unrealized_plpc) * 100 if p.unrealized_plpc else None,
                    "cost_basis":        float(p.cost_basis),
                }
                for p in positions
            ]

        try:
            return await asyncio.to_thread(_fetch)
        except HTTPException:
            raise
        except Exception as e:
            log.error("alpaca_get_positions_error", error=str(e))
            raise HTTPException(status_code=502, detail=f"Alpaca error: {e}")

    # ─── Orders ─────────────────────────────────────────────────────────────

    async def get_orders(self, status: str = "all", limit: int = 50) -> List[Dict[str, Any]]:
        client = self._require_client()

        def _fetch():
            from alpaca.trading.requests import GetOrdersRequest  # type: ignore
            from alpaca.trading.enums import QueryOrderStatus      # type: ignore
            req = GetOrdersRequest(status=QueryOrderStatus(status), limit=limit)
            orders = client.get_orders(filter=req)
            return [
                {
                    "id":               str(o.id),
                    "symbol":           o.symbol,
                    "qty":              float(o.qty) if o.qty else None,
                    "filled_qty":       float(o.filled_qty) if o.filled_qty else 0.0,
                    "order_type":       str(o.order_type.value),
                    "side":             str(o.side.value),
                    "status":           str(o.status.value),
                    "limit_price":      float(o.limit_price) if o.limit_price else None,
                    "stop_price":       float(o.stop_price) if o.stop_price else None,
                    "filled_avg_price": float(o.filled_avg_price) if o.filled_avg_price else None,
                    "created_at":       o.created_at.isoformat() if o.created_at else None,
                    "filled_at":        o.filled_at.isoformat() if o.filled_at else None,
                }
                for o in orders
            ]

        try:
            return await asyncio.to_thread(_fetch)
        except HTTPException:
            raise
        except Exception as e:
            log.error("alpaca_get_orders_error", error=str(e))
            raise HTTPException(status_code=502, detail=f"Alpaca error: {e}")

    # ─── Place Orders ────────────────────────────────────────────────────────

    async def place_market_order(self, symbol: str, qty: float, side: str) -> Dict[str, Any]:
        client = self._require_client()

        def _submit():
            from alpaca.trading.requests import MarketOrderRequest  # type: ignore
            from alpaca.trading.enums import OrderSide, TimeInForce  # type: ignore
            req = MarketOrderRequest(
                symbol=symbol.upper(),
                qty=qty,
                side=OrderSide.BUY if side == "buy" else OrderSide.SELL,
                time_in_force=TimeInForce.DAY,
            )
            order = client.submit_order(req)
            return {
                "id":           str(order.id),
                "symbol":       order.symbol,
                "qty":          float(order.qty) if order.qty else qty,
                "side":         str(order.side.value),
                "order_type":   str(order.order_type.value),
                "status":       str(order.status.value),
                "created_at":   order.created_at.isoformat() if order.created_at else None,
            }

        try:
            return await asyncio.to_thread(_submit)
        except HTTPException:
            raise
        except Exception as e:
            log.error("alpaca_place_market_error", error=str(e))
            raise HTTPException(status_code=400, detail=f"Order rejected: {e}")

    async def place_limit_order(self, symbol: str, qty: float, side: str, limit_price: float) -> Dict[str, Any]:
        client = self._require_client()

        def _submit():
            from alpaca.trading.requests import LimitOrderRequest  # type: ignore
            from alpaca.trading.enums import OrderSide, TimeInForce  # type: ignore
            req = LimitOrderRequest(
                symbol=symbol.upper(),
                qty=qty,
                side=OrderSide.BUY if side == "buy" else OrderSide.SELL,
                time_in_force=TimeInForce.DAY,
                limit_price=limit_price,
            )
            order = client.submit_order(req)
            return {
                "id":           str(order.id),
                "symbol":       order.symbol,
                "qty":          float(order.qty) if order.qty else qty,
                "side":         str(order.side.value),
                "order_type":   str(order.order_type.value),
                "limit_price":  limit_price,
                "status":       str(order.status.value),
                "created_at":   order.created_at.isoformat() if order.created_at else None,
            }

        try:
            return await asyncio.to_thread(_submit)
        except HTTPException:
            raise
        except Exception as e:
            log.error("alpaca_place_limit_error", error=str(e))
            raise HTTPException(status_code=400, detail=f"Order rejected: {e}")

    # ─── Cancel / Close ──────────────────────────────────────────────────────

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        client = self._require_client()
        try:
            await asyncio.to_thread(client.cancel_order_by_id, order_id)
            return {"cancelled": order_id}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cancel failed: {e}")

    async def cancel_all_orders(self) -> Dict[str, Any]:
        client = self._require_client()
        try:
            result = await asyncio.to_thread(client.cancel_orders)
            return {"cancelled_count": len(result) if result else 0}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cancel all failed: {e}")

    async def close_position(self, symbol: str) -> Dict[str, Any]:
        client = self._require_client()
        try:
            order = await asyncio.to_thread(client.close_position, symbol.upper())
            return {"closed": symbol, "order_id": str(order.id)}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Close position failed: {e}")

    async def close_all_positions(self) -> Dict[str, Any]:
        client = self._require_client()
        try:
            result = await asyncio.to_thread(client.close_all_positions, cancel_orders=True)
            return {"closed_count": len(result) if result else 0}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Close all failed: {e}")


alpaca_service = AlpacaService()
