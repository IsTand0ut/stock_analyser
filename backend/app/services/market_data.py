"""Market data service using yfinance and Redis cache."""
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime

import pandas as pd
import yfinance as yf
import structlog

from app.core.cache import cache_get, cache_set
from app.schemas.stock import Fundamentals, HistoricalData, OHLCVBar, StockQuote

log = structlog.get_logger()


class MarketDataService:
    """Fetches quotes, history, and fundamentals from yfinance with Redis caching."""

    async def get_quote(self, ticker: str) -> StockQuote:
        """Fetch real-time(ish) quote using yfinance fast_info."""
        cache_key = f"quote:{ticker}"
        cached = await cache_get(cache_key)
        if cached:
            return StockQuote(**cached)

        def _fetch():
            try:
                t = yf.Ticker(ticker)
                fi = t.fast_info

                # fast_info uses attribute access
                price = float(getattr(fi, "last_price", None) or 0.0)
                prev_close = float(getattr(fi, "previous_close", None) or price or 0.0)
                change = price - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0.0

                mkt_cap = getattr(fi, "market_cap", None)
                year_high = float(getattr(fi, "year_high", None) or 0.0)
                year_low = float(getattr(fi, "year_low", None) or 0.0)
                volume = int(getattr(fi, "three_month_average_volume", None) or 0)

                return StockQuote(
                    ticker=ticker.upper(),
                    name=ticker.upper(),
                    price=round(price, 2),
                    change=round(change, 2),
                    change_pct=round(change_pct, 2),
                    volume=volume,
                    avg_volume=volume,
                    market_cap=mkt_cap,
                    pe_ratio=None,
                    fifty_two_week_high=round(year_high, 2),
                    fifty_two_week_low=round(year_low, 2),
                    timestamp=datetime.utcnow(),
                )
            except Exception as e:
                log.warning("yfinance_quote_error", ticker=ticker, error=str(e))
                # Return a safe zero-value quote instead of crashing
                return StockQuote(
                    ticker=ticker.upper(),
                    name=ticker.upper(),
                    price=0.0,
                    change=0.0,
                    change_pct=0.0,
                    volume=0,
                    avg_volume=0,
                    market_cap=None,
                    pe_ratio=None,
                    fifty_two_week_high=0.0,
                    fifty_two_week_low=0.0,
                    timestamp=datetime.utcnow(),
                )

        quote = await asyncio.to_thread(_fetch)
        # Only cache if we got a real price
        if quote.price > 0:
            await cache_set(cache_key, quote.model_dump(mode="json"), ttl=60)
        return quote

    async def get_history(self, ticker: str, range_str: str = "1M") -> HistoricalData:
        """Fetch OHLCV historical data mapping ranges to yfinance period/interval."""
        cache_key = f"history:{ticker}:{range_str}"
        cached = await cache_get(cache_key)
        if cached:
            return HistoricalData(**cached)

        range_map = {
            "1D": ("1d", "5m"),
            "1W": ("5d", "15m"),
            "1M": ("1mo", "1d"),
            "3M": ("3mo", "1d"),
            "6M": ("6mo", "1d"),
            "YTD": ("ytd", "1d"),
            "1Y": ("1y", "1d"),
            "2Y": ("2y", "1wk"),
            "5Y": ("5y", "1wk"),
        }

        period, interval = range_map.get(range_str.upper(), ("1mo", "1d"))

        def _fetch():
            try:
                t = yf.Ticker(ticker)
                df = t.history(period=period, interval=interval)

                bars = []
                if not df.empty:
                    df = df.reset_index()
                    date_col = "Datetime" if "Datetime" in df.columns else "Date"

                    for _, row in df.iterrows():
                        try:
                            bars.append(OHLCVBar(
                                timestamp=row[date_col].to_pydatetime(),
                                open=round(float(row["Open"]), 2),
                                high=round(float(row["High"]), 2),
                                low=round(float(row["Low"]), 2),
                                close=round(float(row["Close"]), 2),
                                volume=int(row["Volume"]),
                            ))
                        except Exception:
                            continue  # Skip bad rows

                return HistoricalData(
                    ticker=ticker.upper(),
                    range=range_str.upper(),
                    interval=interval,
                    data=bars,
                )
            except Exception as e:
                log.warning("yfinance_history_error", ticker=ticker, error=str(e))
                return HistoricalData(
                    ticker=ticker.upper(),
                    range=range_str.upper(),
                    interval=interval,
                    data=[],
                )

        history = await asyncio.to_thread(_fetch)
        if history.data:
            await cache_set(cache_key, history.model_dump(mode="json"), ttl=3600)
        return history

    async def get_fundamentals(self, ticker: str) -> Fundamentals:
        """Fetch fundamental metrics (P/E, EPS, etc)."""
        cache_key = f"fundamentals:{ticker}"
        cached = await cache_get(cache_key)
        if cached:
            return Fundamentals(**cached)

        def _fetch():
            try:
                t = yf.Ticker(ticker)
                info = t.info or {}

                return Fundamentals(
                    ticker=ticker.upper(),
                    pe_ratio=info.get("trailingPE"),
                    eps=info.get("trailingEps"),
                    roe=info.get("returnOnEquity"),
                    debt_to_equity=info.get("debtToEquity"),
                    free_cash_flow=info.get("freeCashflow"),
                    beta=info.get("beta"),
                    gross_margin=info.get("grossMargins"),
                    operating_margin=info.get("operatingMargins"),
                )
            except Exception as e:
                log.warning("yfinance_fundamentals_error", ticker=ticker, error=str(e))
                return Fundamentals(ticker=ticker.upper())

        fundamentals = await asyncio.to_thread(_fetch)
        await cache_set(cache_key, fundamentals.model_dump(mode="json"), ttl=86400)
        return fundamentals

    async def get_peer_comparison(self, tickers: List[str]) -> List[Fundamentals]:
        """Fetch fundamentals for multiple tickers concurrently."""
        tasks = [self.get_fundamentals(ticker) for ticker in tickers]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        valid = []
        for res in results:
            if isinstance(res, Fundamentals):
                valid.append(res)
            else:
                log.error("peer_comparison_error", error=str(res))
        return valid


market_data_service = MarketDataService()
