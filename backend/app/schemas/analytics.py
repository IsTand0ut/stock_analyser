from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class IndicatorPoint(BaseModel):
    timestamp: datetime
    value: float

class IndicatorsResponse(BaseModel):
    ticker: str
    indicators: Dict[str, List[IndicatorPoint]]

class DCFInput(BaseModel):
    wacc: float = Field(0.10, description="Weighted Average Cost of Capital")
    terminal_growth_rate: float = Field(0.025, description="Terminal growth rate for Gordon Growth Model")
    projection_years: int = Field(5, description="Number of years for FCF projection")
    growth_rate: float = Field(0.05, description="Expected FCF growth rate during projection period")

class DCFResponse(BaseModel):
    ticker: str
    intrinsic_value_per_share: float
    current_price: float
    margin_of_safety: float
    upside_pct: float
    pv_stage1: float
    pv_terminal: float
    shares_outstanding: int
    base_fcf: float
    error: Optional[str] = None

class BacktestSignal(BaseModel):
    timestamp: datetime
    type: str
    price: float

class BacktestResponse(BaseModel):
    ticker: str
    total_return: float
    annualized_return: float
    sharpe: float
    max_drawdown: float
    num_trades: int
    win_rate: float
    signals: List[BacktestSignal]
    error: Optional[str] = None
