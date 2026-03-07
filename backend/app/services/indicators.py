"""Technical indicators service using pandas-ta."""
from typing import Dict, List
import pandas as pd
import pandas_ta as ta
import numpy as np
from datetime import datetime

from app.services.market_data import market_data_service


class IndicatorsService:
    """Computes RSI, MACD, Bollinger Bands, SMA, EMA, volatility via pandas-ta."""

    async def get_all(self, ticker: str, range_str: str = "1Y") -> Dict[str, List[Dict]]:
        """
        Calculate a comprehensive set of technical indicators and performance metrics.
        Returns a dict mapping indicator names to lists of {timestamp, value}.
        """
        # Fetch historical data
        history = await market_data_service.get_history(ticker, range_str)
        if not history.data:
            return {}

        # Convert to DataFrame
        df = pd.DataFrame([b.model_dump() for b in history.data])
        df.set_index("timestamp", inplace=True)

        # Technical Indicators via pandas-ta
        # RSI
        df.ta.rsi(length=14, append=True)
        # MACD (default: fast=12, slow=26, signal=9)
        df.ta.macd(append=True)
        # Bollinger Bands
        df.ta.bbands(length=20, std=2, append=True)
        # SMAs
        df.ta.sma(length=20, append=True)
        df.ta.sma(length=50, append=True)
        df.ta.sma(length=200, append=True)
        # EMAs
        df.ta.ema(length=12, append=True)
        df.ta.ema(length=26, append=True)

        # Performance Metrics
        # Rolling Volatility (30d) - assuming daily data for 1Y/etc
        df["volatility_30d"] = df["close"].pct_change().rolling(30).std() * np.sqrt(252)

        # Returns for Sharpe/Drawdown
        returns = df["close"].pct_change().dropna()
        
        # Annualized Sharpe Ratio (risk-free rate = 0 for simplicity)
        if len(returns) > 1:
            sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() != 0 else 0
        else:
            sharpe = 0

        # Max Drawdown
        cumulative_returns = (1 + returns).cumprod()
        peak = cumulative_returns.cummax()
        drawdown = (cumulative_returns - peak) / peak
        max_drawdown = drawdown.min()

        # Prepare response
        result = {}
        
        # Map pandas-ta column names to friendly names
        mapping = {
            "RSI_14": "rsi",
            "MACDH_12_26_9": "macd_hist",
            "MACD_12_26_9": "macd",
            "MACDS_12_26_9": "macd_signal",
            "BBL_20_2.0": "bb_lower",
            "BBM_20_2.0": "bb_middle",
            "BBU_20_2.0": "bb_upper",
            "SMA_20": "sma_20",
            "SMA_50": "sma_50",
            "SMA_200": "sma_200",
            "EMA_12": "ema_12",
            "EMA_26": "ema_26",
            "volatility_30d": "volatility_30d"
        }

        for col, label in mapping.items():
            if col in df.columns:
                series = df[col].dropna()
                result[label] = [
                    {"timestamp": ts.isoformat(), "value": round(float(val), 4)}
                    for ts, val in series.items()
                ]

        # Add single-value metrics (wrapped in list for consistency or handled separately)
        # The user asked for "Each indicator returns list of {timestamp, value} dicts"
        # Sharpe and Max Drawdown are often single values, but I can provide them as the latest value
        result["sharpe_ratio"] = [{"timestamp": datetime.utcnow().isoformat(), "value": round(float(sharpe), 4)}]
        result["max_drawdown"] = [{"timestamp": datetime.utcnow().isoformat(), "value": round(float(max_drawdown), 4)}]

        return result


indicators_service = IndicatorsService()
