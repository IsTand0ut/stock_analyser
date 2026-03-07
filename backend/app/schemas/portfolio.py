"""Pydantic schemas for portfolio and holdings."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class HoldingCreate(BaseModel):
    ticker: str
    shares: Decimal
    avg_cost: Decimal


class HoldingResponse(BaseModel):
    id: int
    ticker: str
    shares: Decimal
    avg_cost: Decimal
    purchased_at: datetime

    model_config = {"from_attributes": True}


class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class PortfolioResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    holdings: List[HoldingResponse] = []

    model_config = {"from_attributes": True}


class HoldingUpdate(BaseModel):
    shares: Optional[Decimal] = None
    avg_cost: Optional[Decimal] = None


class PortfolioPnL(BaseModel):
    """Portfolio with live P&L calculated server-side."""
    portfolio_name: str
    total_value: float
    total_cost: float
    unrealized_pnl: float
    pnl_pct: float
    holdings: List[dict]
