from typing import List
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.services.market_data import market_data_service
from app.schemas.stock import Fundamentals, HistoricalData, StockQuote

router = APIRouter()


@router.get("/{ticker}/quote", summary="Real-time stock quote", response_model=StockQuote)
async def get_quote(ticker: str, current_user: int = Depends(get_current_user)):
    return await market_data_service.get_quote(ticker)


@router.get("/{ticker}/history", summary="OHLCV historical data", response_model=HistoricalData)
async def get_history(
    ticker: str, 
    range: str = Query("1M", description="1D, 1W, 1M, 3M, YTD, 1Y, 5Y"), 
    current_user: int = Depends(get_current_user)
):
    return await market_data_service.get_history(ticker, range)


@router.get("/{ticker}/fundamentals", summary="Fundamental metrics", response_model=Fundamentals)
async def get_fundamentals(ticker: str, current_user: int = Depends(get_current_user)):
    return await market_data_service.get_fundamentals(ticker)


@router.get("/compare", summary="Compare multiple tickers", response_model=List[Fundamentals])
async def compare_tickers(
    tickers: str = Query(..., description="Comma separated list, e.g. AAPL,MSFT,GOOGL"), 
    current_user: int = Depends(get_current_user)
):
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    return await market_data_service.get_peer_comparison(ticker_list)
