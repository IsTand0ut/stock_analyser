"""DCF valuation service using yfinance fundamentals."""
import asyncio
from typing import Dict, Any, Optional
import yfinance as yf
import structlog

from app.services.market_data import market_data_service

log = structlog.get_logger()

class ValuationService:
    """Runs a 2-stage DCF model with Gordon Growth terminal value."""

    async def dcf(
        self, 
        ticker: str, 
        wacc: float = 0.10, 
        terminal_growth_rate: float = 0.025, 
        projection_years: int = 5,
        growth_rate: float = 0.05
    ) -> Dict[str, Any]:
        """
        Calculate intrinsic value using a 2-stage Discounted Cash Flow model.
        """
        def _fetch_fundamentals():
            try:
                t = yf.Ticker(ticker)
                info = t.info or {}
                fi = t.fast_info

                # FCF: prefer info, fall back to cashflow statement
                fcf = info.get("freeCashflow")
                if fcf is None:
                    cf = t.cashflow
                    if cf is not None and not cf.empty:
                        if "Free Cash Flow" in cf.index:
                            fcf = float(cf.loc["Free Cash Flow"].iloc[0])
                        elif "Operating Cash Flow" in cf.index and "Capital Expenditure" in cf.index:
                            fcf = float(cf.loc["Operating Cash Flow"].iloc[0]) + float(cf.loc["Capital Expenditure"].iloc[0])

                # Shares: prefer info, then fast_info.shares
                shares = info.get("sharesOutstanding") or getattr(fi, "shares", None)

                # Current price: prefer info, then fast_info.last_price
                current_price = (
                    info.get("currentPrice")
                    or info.get("regularMarketPrice")
                    or getattr(fi, "last_price", None)
                )

                return fcf, shares, current_price
            except Exception as e:
                log.warning("valuation_fetch_error", ticker=ticker, error=str(e))
                return None, None, None


        fcf, shares, current_price = await asyncio.to_thread(_fetch_fundamentals)

        if not fcf or not shares or not current_price:
            return {
                "error": "Missing fundamental data (FCF, Shares, or Price) to run DCF",
                "ticker": ticker.upper()
            }

        # Stage 1: Project FCF for projection_years
        projected_fcfs = []
        current_fcf = fcf
        for i in range(1, projection_years + 1):
            next_fcf = current_fcf * (1 + growth_rate)
            projected_fcfs.append(next_fcf)
            current_fcf = next_fcf

        # Discount Stage 1 FCFs
        pv_stage1 = 0
        for i, fcf_val in enumerate(projected_fcfs):
            pv_stage1 += fcf_val / ((1 + wacc) ** (i + 1))

        # Stage 2: Terminal Value (Gordon Growth Model)
        terminal_fcf = projected_fcfs[-1] * (1 + terminal_growth_rate)
        terminal_value = terminal_fcf / (wacc - terminal_growth_rate)
        pv_terminal = terminal_value / ((1 + wacc) ** projection_years)

        # Enterprise Value (simplification: ignoring net debt for this interview-grade scaffold)
        # In a real model, we would include Net Debt to get Equity Value
        equity_value = pv_stage1 + pv_terminal
        intrinsic_value_per_share = equity_value / shares
        
        margin_of_safety = (intrinsic_value_per_share - current_price) / intrinsic_value_per_share
        upside_pct = ((intrinsic_value_per_share / current_price) - 1) * 100

        return {
            "ticker": ticker.upper(),
            "intrinsic_value_per_share": round(intrinsic_value_per_share, 2),
            "current_price": round(current_price, 2),
            "margin_of_safety": round(margin_of_safety, 4),
            "upside_pct": round(upside_pct, 2),
            "pv_stage1": round(pv_stage1, 2),
            "pv_terminal": round(pv_terminal, 2),
            "shares_outstanding": int(shares),
            "base_fcf": float(fcf),
            "error": None
        }


valuation_service = ValuationService()
