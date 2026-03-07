"""Backtesting service for trading strategies."""
from typing import Dict, List, Any
import pandas as pd
import numpy as np

from app.services.market_data import market_data_service


class BacktestingService:
    """Runs MA crossover backtests on historical data."""

    async def ma_crossover(
        self,
        ticker: str,
        fast_period: int = 20,
        slow_period: int = 50,
        range_str: str = "2Y",
    ) -> Dict[str, Any]:
        """
        Backtest a simple Moving Average Crossover strategy.
        Long when fast MA crosses above slow MA, exit otherwise.
        """
        history = await market_data_service.get_history(ticker, range_str)
        if not history.data or len(history.data) < slow_period:
            return {"error": "Insufficient data for periods", "ticker": ticker.upper()}

        df = pd.DataFrame([b.model_dump() for b in history.data])
        df.set_index("timestamp", inplace=True)

        # Calculate MAs
        df["fast_ma"] = df["close"].rolling(window=fast_period).mean()
        df["slow_ma"] = df["close"].rolling(window=slow_period).mean()

        # Generate Signals
        # 1 when fast > slow, 0 otherwise
        df["position"] = np.where(df["fast_ma"] > df["slow_ma"], 1, 0)
        # Signal is change in position
        df["signal"] = df["position"].diff()

        # Calculate Returns
        df["market_return"] = df["close"].pct_change()
        # Strategy return is previous day's position * today's return
        df["strategy_return"] = df["position"].shift(1) * df["market_return"]

        # Metrics
        total_return = (1 + df["strategy_return"]).prod() - 1
        
        # Performance stats
        returns = df["strategy_return"].dropna()
        annualized_return = (returns.mean() * 252) if not returns.empty else 0
        sharpe = (returns.mean() / returns.std() * np.sqrt(252)) if not returns.empty and returns.std() != 0 else 0
        
        # Drawdown
        cum_returns = (1 + returns).cumprod()
        peak = cum_returns.cummax()
        drawdown = (cum_returns - peak) / peak
        max_drawdown = drawdown.min()

        # Trade analytics
        trades = df[df["signal"] != 0].copy()
        num_trades = len(trades) // 2 # Rough count of buy/sell pairs
        
        # Win rate (simplified: profitable positions)
        # This is basic, real win rate would track specific trade entries/exits
        win_rate = (returns > 0).mean()

        # Prepare signals list for frontend
        signals = []
        signal_events = df[df["signal"] != 0].copy()
        for ts, row in signal_events.iterrows():
            signals.append({
                "timestamp": ts.isoformat(),
                "type": "BUY" if row["signal"] > 0 else "SELL",
                "price": round(float(row["close"]), 2)
            })

        return {
            "ticker": ticker.upper(),
            "total_return": round(float(total_return), 4),
            "annualized_return": round(float(annualized_return), 4),
            "sharpe": round(float(sharpe), 4),
            "max_drawdown": round(float(max_drawdown), 4),
            "num_trades": num_trades,
            "win_rate": round(float(win_rate), 4),
            "signals": signals
        }


backtesting_service = BacktestingService()
