"""Analytics routes: /api/v1/analytics"""
from typing import List
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.schemas.analytics import (
    DCFInput, 
    DCFResponse, 
    IndicatorsResponse, 
    BacktestResponse
)
from app.schemas.sentiment import NewsItem
from app.services.indicators import indicators_service
from app.services.valuation import valuation_service
from app.services.backtesting import backtesting_service
from app.services.sentiment import sentiment_service

router = APIRouter()


@router.get("/{ticker}/sentiment", response_model=List[NewsItem])
async def get_sentiment(ticker: str, current_user: int = Depends(get_current_user)):
    """Fetch recent news with sentiment analysis."""
    return await sentiment_service.get_news_with_sentiment(ticker)


@router.get("/{ticker}/technicals", response_model=IndicatorsResponse)
async def get_technicals(
    ticker: str, 
    range_str: str = Query("1Y", alias="range"), 
    current_user: int = Depends(get_current_user)
):
    """Fetch technical indicators (RSI, MACD, BB, SMA, EMA, Volatility)."""
    data = await indicators_service.get_all(ticker, range_str)
    return {"ticker": ticker.upper(), "indicators": data}


@router.post("/{ticker}/dcf", response_model=DCFResponse)
async def run_dcf(
    ticker: str, 
    inputs: DCFInput,
    current_user: int = Depends(get_current_user)
):
    """Run a 2-stage DCF valuation model."""
    result = await valuation_service.dcf(
        ticker=ticker,
        wacc=inputs.wacc,
        terminal_growth_rate=inputs.terminal_growth_rate,
        projection_years=inputs.projection_years,
        growth_rate=inputs.growth_rate
    )
    return result


@router.get("/{ticker}/backtest", response_model=BacktestResponse)
async def run_backtest(
    ticker: str, 
    fast: int = 20, 
    slow: int = 50, 
    range_str: str = Query("2Y", alias="range"),
    current_user: int = Depends(get_current_user)
):
    """Run a Moving Average Crossover backtest."""
    result = await backtesting_service.ma_crossover(
        ticker=ticker,
        fast_period=fast,
        slow_period=slow,
        range_str=range_str
    )
    return result
