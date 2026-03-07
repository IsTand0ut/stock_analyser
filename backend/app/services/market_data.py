"""Market data service using yfinance and Redis cache."""
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime

import pandas as pd
import yfinance as yf
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

from app.core.cache import cache_get, cache_set
from app.schemas.stock import Fundamentals, HistoricalData, OHLCVBar, StockQuote

log = structlog.get_logger()

class MarketDataService:
    """Fetches quotes, history, and fundamentals from yfinance with Redis caching."""

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_quote(self, ticker: str) -> StockQuote:
        """Fetch real-time(ish) quote using yfinance fast_info."""
        cache_key = f"quote:{ticker}"
        cached = await cache_get(cache_key)
        if cached:
            return StockQuote(**cached)

        # yfinance is blocking, so run in executor
        def _fetch():
            t = yf.Ticker(ticker)
            info = t.fast_info
            # fast_info doesn't always have everything, fallback to info if needed
            # but fast_info is much faster
            price = info.get("lastPrice", 0.0)
            prev_close = info.get("previousClose", price)
            change = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0.0
            
            return StockQuote(
                ticker=ticker.upper(),
                name=ticker.upper(), # fast_info often lacks shortName
                price=round(price, 2),
                change=round(change, 2),
                change_pct=round(change_pct, 2),
                volume=int(info.get("lastVolume", 0)),
                avg_volume=int(info.get("threeMonthAverageVolume", 0)),
                market_cap=info.get("marketCap"),
                pe_ratio=None, # Not in fast_info
                fifty_two_week_high=round(info.get("yearHigh", 0.0), 2),
                fifty_two_week_low=round(info.get("yearLow", 0.0), 2),
                timestamp=datetime.utcnow()
            )

        quote = await asyncio.to_thread(_fetch)
        await cache_set(cache_key, quote.model_dump(mode="json"), ttl=60)
        return quote

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_history(self, ticker: str, range_str: str = "1M") -> HistoricalData:
        """Fetch OHLCV historical data mapping ranges to yfinance period/interval."""
        cache_key = f"history:{ticker}:{range_str}"
        cached = await cache_get(cache_key)
        if cached:
            return HistoricalData(**cached)

        # Map common ranges to yf period/interval
        range_map = {
            "1D": ("1d", "5m"),
            "1W": ("5d", "15m"),
            "1M": ("1mo", "1d"),
            "3M": ("3mo", "1d"),
            "YTD": ("ytd", "1d"),
            "1Y": ("1y", "1d"),
            "5Y": ("5y", "1wk"),
        }
        
        period, interval = range_map.get(range_str.upper(), ("1mo", "1d"))

        def _fetch():
            t = yf.Ticker(ticker)
            df = t.history(period=period, interval=interval)
            
            bars = []
            if not df.empty:
                # Reset index to get Date/Datetime as a column
                df = df.reset_index()
                date_col = "Datetime" if "Datetime" in df.columns else "Date"
                
                for _, row in df.iterrows():
                    bars.append(OHLCVBar(
                        timestamp=row[date_col].to_pydatetime(),
                        open=round(float(row["Open"]), 2),
                        high=round(float(row["High"]), 2),
                        low=round(float(row["Low"]), 2),
                        close=round(float(row["Close"]), 2),
                        volume=int(row["Volume"])
                    ))
            
            return HistoricalData(
                ticker=ticker.upper(),
                range=range_str.upper(),
                interval=interval,
                data=bars
            )

        history = await asyncio.to_thread(_fetch)
        # Cache for 1 hour
        await cache_set(cache_key, history.model_dump(mode="json"), ttl=3600)
        return history

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_fundamentals(self, ticker: str) -> Fundamentals:
        """Fetch fundamental metrics (P/E, EPS, etc)."""
        cache_key = f"fundamentals:{ticker}"
        cached = await cache_get(cache_key)
        if cached:
            return Fundamentals(**cached)

        def _fetch():
            t = yf.Ticker(ticker)
            info = t.info
            
            return Fundamentals(
                ticker=ticker.upper(),
                pe_ratio=info.get("trailingPE"),
                eps=info.get("trailingEps"),
                roe=info.get("returnOnEquity"),
                debt_to_equity=info.get("debtToEquity"),
                free_cash_flow=info.get("freeCashflow"),
                beta=info.get("beta"),
                gross_margin=info.get("grossMargins"),
                operating_margin=info.get("operatingMargins")
            )

        fundamentals = await asyncio.to_thread(_fetch)
        # Cache for 24 hours
        await cache_set(cache_key, fundamentals.model_dump(mode="json"), ttl=86400)
        return fundamentals

    async def get_peer_comparison(self, tickers: List[str]) -> List[Fundamentals]:
        """Fetch fundamentals for multiple tickers concurrently."""
        # Use asyncio.gather to fetch all concurrently
        tasks = [self.get_fundamentals(ticker) for ticker in tickers]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out any that failed
        valid_results = []
        for res in results:
            if isinstance(res, Fundamentals):
                valid_results.append(res)
            else:
                log.error("peer_comparison_error", error=str(res))
                
        return valid_results

market_data_service = MarketDataService()
