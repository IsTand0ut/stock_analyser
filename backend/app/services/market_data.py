"""Market data service using yfinance and Redis cache."""
import asyncio
from io import StringIO
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
import requests
import structlog

from app.core.cache import cache_get, cache_set
from app.core.config import settings
from app.schemas.stock import Fundamentals, HistoricalData, OHLCVBar, StockQuote

log = structlog.get_logger()


class MarketDataService:
    """Fetches quotes, history, and fundamentals from yfinance with Redis caching."""

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        try:
            if value in (None, "", "None", "N/A", "-"):
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    async def get_quote(self, ticker: str) -> StockQuote:
        """Fetch real-time(ish) quote using yfinance fast_info."""
        cache_key = f"quote:{ticker}"
        cached = await cache_get(cache_key)
        if cached:
            return StockQuote(**cached)

        def _fetch():
            try:
                t = yf.Ticker(ticker)
                info: Dict[str, Any] = {}

                try:
                    info = t.info or {}
                except Exception as e:
                    log.warning("yfinance_info_error", ticker=ticker, error=str(e))
                # fast_info can be unstable in some regions/rate-limit states;
                # prefer recent OHLCV bars as primary source.
                df = yf.download(
                    tickers=ticker,
                    period="5d",
                    interval="1d",
                    progress=False,
                    auto_adjust=False,
                    threads=False,
                )

                price = 0.0
                prev_close = 0.0
                volume = 0
                if isinstance(df, pd.DataFrame) and not df.empty:
                    last_close = df["Close"].dropna().iloc[-1] if "Close" in df.columns else None
                    price = float(last_close) if last_close is not None else 0.0

                    closes = df["Close"].dropna().tolist() if "Close" in df.columns else []
                    if len(closes) >= 2:
                        prev_close = float(closes[-2])
                    else:
                        prev_close = price

                    if "Volume" in df.columns:
                        vol_series = df["Volume"].dropna()
                        volume = int(vol_series.iloc[-1]) if not vol_series.empty else 0

                # Fallback to info if history is unavailable.
                if price <= 0:
                    price = float(info.get("regularMarketPrice") or 0.0)
                    prev_close = float(info.get("regularMarketPreviousClose") or price or 0.0)
                    if volume == 0:
                        volume = int(info.get("regularMarketVolume") or 0)

                # Final fallback: Stooq CSV endpoint (works well when Yahoo returns 429).
                if price <= 0:
                    stooq_symbol = f"{ticker.lower()}.us"
                    stooq_url = f"https://stooq.com/q/l/?s={stooq_symbol}&i=d"
                    resp = requests.get(stooq_url, timeout=8)
                    resp.raise_for_status()
                    raw = resp.text.strip()
                    # Format: SYMBOL,DATE,TIME,OPEN,HIGH,LOW,CLOSE,VOLUME,
                    parts = raw.split(",")
                    if len(parts) >= 8 and parts[3] != "N/D":
                        open_px = float(parts[3])
                        close_px = float(parts[6])
                        vol = int(float(parts[7]))
                        price = close_px
                        prev_close = open_px if open_px > 0 else close_px
                        volume = vol

                change = price - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0.0

                mkt_cap = info.get("marketCap")
                year_high = float(info.get("fiftyTwoWeekHigh") or 0.0)
                year_low = float(info.get("fiftyTwoWeekLow") or 0.0)
                name = (info.get("shortName") or info.get("longName") or ticker).upper()

                return StockQuote(
                    ticker=ticker.upper(),
                    name=name,
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
            def _bars_from_df(df: pd.DataFrame) -> List[OHLCVBar]:
                bars: List[OHLCVBar] = []
                if df.empty:
                    return bars

                frame = df.reset_index()
                date_col = "Datetime" if "Datetime" in frame.columns else "Date"

                for _, row in frame.iterrows():
                    try:
                        ts = row[date_col]
                        ts = ts.to_pydatetime() if hasattr(ts, "to_pydatetime") else datetime.fromisoformat(str(ts))
                        bars.append(
                            OHLCVBar(
                                timestamp=ts,
                                open=round(float(row["Open"]), 2),
                                high=round(float(row["High"]), 2),
                                low=round(float(row["Low"]), 2),
                                close=round(float(row["Close"]), 2),
                                volume=int(row["Volume"]),
                            )
                        )
                    except Exception:
                        continue
                return bars

            try:
                t = yf.Ticker(ticker)
                df = t.history(period=period, interval=interval)

                bars = _bars_from_df(df) if isinstance(df, pd.DataFrame) else []

                # Fallback to Stooq historical CSV if Yahoo returns empty/rate-limited.
                if not bars:
                    try:
                        now = datetime.utcnow()
                        range_days_map = {
                            "1D": 5,
                            "1W": 10,
                            "1M": 31,
                            "3M": 93,
                            "6M": 186,
                            "YTD": (now - datetime(now.year, 1, 1)).days + 2,
                            "1Y": 366,
                            "2Y": 730,
                            "5Y": 365 * 5,
                        }
                        keep_days = range_days_map.get(range_str.upper(), 31)
                        start = (now - timedelta(days=keep_days)).date().isoformat()
                        end = now.date().isoformat()

                        poly_resp = requests.get(
                            f"https://api.polygon.io/v2/aggs/ticker/{ticker.upper()}/range/1/day/{start}/{end}",
                            params={
                                "adjusted": "true",
                                "sort": "asc",
                                "limit": 5000,
                                "apiKey": settings.POLYGON_API_KEY,
                            },
                            timeout=12,
                        )
                        poly_resp.raise_for_status()
                        payload = poly_resp.json()
                        results = payload.get("results", [])
                        if isinstance(results, list) and results:
                            bars = []
                            for row in results:
                                try:
                                    bars.append(
                                        OHLCVBar(
                                            timestamp=datetime.utcfromtimestamp(int(row.get("t", 0)) / 1000),
                                            open=round(float(row.get("o", 0.0)), 2),
                                            high=round(float(row.get("h", 0.0)), 2),
                                            low=round(float(row.get("l", 0.0)), 2),
                                            close=round(float(row.get("c", 0.0)), 2),
                                            volume=int(row.get("v", 0)),
                                        )
                                    )
                                except Exception:
                                    continue
                    except Exception as e:
                        log.warning("polygon_history_error", ticker=ticker, error=str(e))

                if not bars:
                    try:
                        stooq_symbol = f"{ticker.lower()}.us"
                        stooq_url = f"https://stooq.com/q/d/l/?s={stooq_symbol}&i=d"
                        resp = requests.get(stooq_url, timeout=10)
                        resp.raise_for_status()

                        stooq_df = pd.read_csv(StringIO(resp.text))
                        if not stooq_df.empty and "Date" in stooq_df.columns:
                            stooq_df["Date"] = pd.to_datetime(stooq_df["Date"], errors="coerce")
                            stooq_df = stooq_df.dropna(subset=["Date", "Open", "High", "Low", "Close", "Volume"])

                            now = datetime.utcnow()
                            range_days_map = {
                                "1D": 2,
                                "1W": 7,
                                "1M": 31,
                                "3M": 93,
                                "6M": 186,
                                "YTD": (now - datetime(now.year, 1, 1)).days + 2,
                                "1Y": 366,
                                "2Y": 730,
                                "5Y": 365 * 5,
                            }
                            keep_days = range_days_map.get(range_str.upper(), 31)
                            cutoff = now - timedelta(days=keep_days)
                            stooq_df = stooq_df[stooq_df["Date"] >= pd.Timestamp(cutoff)]

                            stooq_df = stooq_df.rename(
                                columns={
                                    "Date": "Datetime",
                                    "Open": "Open",
                                    "High": "High",
                                    "Low": "Low",
                                    "Close": "Close",
                                    "Volume": "Volume",
                                }
                            )
                            bars = _bars_from_df(stooq_df)
                    except Exception as e:
                        log.warning("stooq_history_error", ticker=ticker, error=str(e))

                # Optional fallback with free Alpha Vantage API key.
                if not bars and settings.ALPHA_VANTAGE_KEY:
                    try:
                        av_url = "https://www.alphavantage.co/query"
                        av_resp = requests.get(
                            av_url,
                            params={
                                "function": "TIME_SERIES_DAILY",
                                "symbol": ticker.upper(),
                                "outputsize": "full",
                                "apikey": settings.ALPHA_VANTAGE_KEY,
                            },
                            timeout=12,
                        )
                        av_resp.raise_for_status()
                        payload = av_resp.json()
                        series = payload.get("Time Series (Daily)", {})

                        if isinstance(series, dict) and series:
                            rows: List[OHLCVBar] = []
                            for dt_str, vals in series.items():
                                try:
                                    ts = datetime.fromisoformat(dt_str)
                                    rows.append(
                                        OHLCVBar(
                                            timestamp=ts,
                                            open=round(float(vals.get("1. open", 0.0)), 2),
                                            high=round(float(vals.get("2. high", 0.0)), 2),
                                            low=round(float(vals.get("3. low", 0.0)), 2),
                                            close=round(float(vals.get("4. close", 0.0)), 2),
                                            volume=int(float(vals.get("5. volume", 0.0))),
                                        )
                                    )
                                except Exception:
                                    continue

                            rows.sort(key=lambda b: b.timestamp)

                            now = datetime.utcnow()
                            range_days_map = {
                                "1D": 2,
                                "1W": 7,
                                "1M": 31,
                                "3M": 93,
                                "6M": 186,
                                "YTD": (now - datetime(now.year, 1, 1)).days + 2,
                                "1Y": 366,
                                "2Y": 730,
                                "5Y": 365 * 5,
                            }
                            keep_days = range_days_map.get(range_str.upper(), 31)
                            cutoff = now - timedelta(days=keep_days)
                            bars = [b for b in rows if b.timestamp >= cutoff]
                    except Exception as e:
                        log.warning("alpha_vantage_history_error", ticker=ticker, error=str(e))

                # Last resort: single-day bar from Stooq quote endpoint.
                if not bars:
                    try:
                        quote_url = f"https://stooq.com/q/l/?s={ticker.lower()}.us&i=d"
                        q_resp = requests.get(quote_url, timeout=8)
                        q_resp.raise_for_status()
                        raw = q_resp.text.strip()
                        parts = raw.split(",")
                        if len(parts) >= 8 and parts[3] != "N/D":
                            ts = datetime.utcnow()
                            try:
                                if parts[1] not in ("", "N/D"):
                                    ts = datetime.fromisoformat(parts[1])
                            except Exception:
                                pass

                            bars = [
                                OHLCVBar(
                                    timestamp=ts,
                                    open=round(float(parts[3]), 2),
                                    high=round(float(parts[4]), 2),
                                    low=round(float(parts[5]), 2),
                                    close=round(float(parts[6]), 2),
                                    volume=int(float(parts[7])),
                                )
                            ]
                    except Exception as e:
                        log.warning("stooq_quote_history_error", ticker=ticker, error=str(e))

                return HistoricalData(
                    ticker=ticker.upper(),
                    range=range_str.upper(),
                    interval="1d" if bars else interval,
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
            info: Dict[str, Any] = {}
            try:
                t = yf.Ticker(ticker)
                info = t.info or {}
            except Exception as e:
                log.warning("yfinance_fundamentals_error", ticker=ticker, error=str(e))

            fundamentals = Fundamentals(
                ticker=ticker.upper(),
                pe_ratio=self._to_float(info.get("trailingPE")),
                eps=self._to_float(info.get("trailingEps")),
                roe=self._to_float(info.get("returnOnEquity")),
                debt_to_equity=self._to_float(info.get("debtToEquity")),
                free_cash_flow=self._to_float(info.get("freeCashflow")),
                beta=self._to_float(info.get("beta")),
                gross_margin=self._to_float(info.get("grossMargins")),
                operating_margin=self._to_float(info.get("operatingMargins")),
            )

            has_any = any(
                getattr(fundamentals, field) is not None
                for field in (
                    "pe_ratio",
                    "eps",
                    "roe",
                    "debt_to_equity",
                    "free_cash_flow",
                    "beta",
                    "gross_margin",
                    "operating_margin",
                )
            )

            if has_any:
                return fundamentals

            if settings.ALPHA_VANTAGE_KEY:
                try:
                    av_resp = requests.get(
                        "https://www.alphavantage.co/query",
                        params={
                            "function": "OVERVIEW",
                            "symbol": ticker.upper(),
                            "apikey": settings.ALPHA_VANTAGE_KEY,
                        },
                        timeout=12,
                    )
                    av_resp.raise_for_status()
                    overview = av_resp.json()

                    if isinstance(overview, dict) and overview.get("Symbol"):
                        return Fundamentals(
                            ticker=ticker.upper(),
                            pe_ratio=self._to_float(overview.get("PERatio")),
                            eps=self._to_float(overview.get("EPS")),
                            roe=self._to_float(overview.get("ReturnOnEquityTTM")),
                            debt_to_equity=self._to_float(overview.get("DebtToEquity")),
                            free_cash_flow=self._to_float(overview.get("FreeCashFlowTTM")),
                            beta=self._to_float(overview.get("Beta")),
                            gross_margin=self._to_float(overview.get("GrossMargin")),
                            operating_margin=self._to_float(overview.get("OperatingMarginTTM")),
                        )
                except Exception as e:
                    log.warning("alpha_vantage_fundamentals_error", ticker=ticker, error=str(e))

            return fundamentals

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
