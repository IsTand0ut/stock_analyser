"""Pydantic schemas for price alerts."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class AlertCreate(BaseModel):
    ticker: str
    direction: Literal["up", "down"]
    target_price: float


class AlertResponse(BaseModel):
    id: int
    ticker: str
    direction: str
    target_price: float
    is_active: bool
    created_at: datetime
    triggered_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
