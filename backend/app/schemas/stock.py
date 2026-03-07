"""Pydantic schemas for stock data."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class StockQuote(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_pct: float
    volume: int
    avg_volume: int
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    fifty_two_week_high: float
    fifty_two_week_low: float
    timestamp: datetime

    model_config = {"from_attributes": True}


class OHLCVBar(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoricalData(BaseModel):
    ticker: str
    range: str
    interval: str
    data: List[OHLCVBar]


class Fundamentals(BaseModel):
    ticker: str
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None
    free_cash_flow: Optional[float] = None
    beta: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
