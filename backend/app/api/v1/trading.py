"""Paper trading routes — all protected by JWT."""
from typing import List
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.services.alpaca_service import alpaca_service
from app.schemas.trading import (
    MarketOrderRequest,
    LimitOrderRequest,
    AccountResponse,
)

router = APIRouter()


@router.get("/account", summary="Get Alpaca paper trading account details")
async def get_account(_user=Depends(get_current_user)):
    return await alpaca_service.get_account()


@router.get("/positions", summary="Get all open positions")
async def get_positions(_user=Depends(get_current_user)):
    return await alpaca_service.get_positions()


@router.get("/orders", summary="Get order history")
async def get_orders(
    status: str = Query("all", description="Filter: all | open | closed"),
    limit: int = Query(50, ge=1, le=200),
    _user=Depends(get_current_user),
):
    return await alpaca_service.get_orders(status=status, limit=limit)


@router.post("/orders/market", summary="Place a market order")
async def place_market_order(body: MarketOrderRequest, _user=Depends(get_current_user)):
    return await alpaca_service.place_market_order(
        symbol=body.symbol.upper(),
        qty=body.qty,
        side=body.side,
    )


@router.post("/orders/limit", summary="Place a limit order")
async def place_limit_order(body: LimitOrderRequest, _user=Depends(get_current_user)):
    return await alpaca_service.place_limit_order(
        symbol=body.symbol.upper(),
        qty=body.qty,
        side=body.side,
        limit_price=body.limit_price,
    )


@router.delete("/orders/{order_id}", summary="Cancel a specific order")
async def cancel_order(order_id: str, _user=Depends(get_current_user)):
    return await alpaca_service.cancel_order(order_id)


@router.delete("/orders", summary="Cancel ALL open orders")
async def cancel_all_orders(_user=Depends(get_current_user)):
    return await alpaca_service.cancel_all_orders()


@router.delete("/positions/{symbol}", summary="Close a specific position")
async def close_position(symbol: str, _user=Depends(get_current_user)):
    return await alpaca_service.close_position(symbol.upper())


@router.delete("/positions", summary="Close ALL open positions")
async def close_all_positions(_user=Depends(get_current_user)):
    return await alpaca_service.close_all_positions()
