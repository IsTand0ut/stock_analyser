"""Pydantic schemas for the Paper Trading API."""
from typing import Literal, Optional
from pydantic import BaseModel, Field


class MarketOrderRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10, description="Ticker symbol e.g. AAPL")
    qty: float = Field(..., gt=0, description="Number of shares (fractional supported)")
    side: Literal["buy", "sell"]


class LimitOrderRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    qty: float = Field(..., gt=0)
    side: Literal["buy", "sell"]
    limit_price: float = Field(..., gt=0, description="Limit price per share")


class AccountResponse(BaseModel):
    buying_power: float
    cash: float
    portfolio_value: float
    equity: float
    last_equity: float
    day_pnl: float
    day_pnl_pct: float
    day_trade_count: int
    pattern_day_trader: bool
    account_status: str
    currency: str


class PositionResponse(BaseModel):
    symbol: str
    qty: float
    side: str
    avg_entry_price: float
    current_price: Optional[float]
    market_value: Optional[float]
    unrealized_pl: Optional[float]
    unrealized_plpc: Optional[float]
    cost_basis: float


class OrderResponse(BaseModel):
    id: str
    symbol: str
    qty: Optional[float]
    filled_qty: float
    order_type: str
    side: str
    status: str
    limit_price: Optional[float]
    stop_price: Optional[float]
    filled_avg_price: Optional[float]
    created_at: Optional[str]
    filled_at: Optional[str]
