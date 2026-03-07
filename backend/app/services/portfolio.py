"""Portfolio management service with P&L calculations."""
from typing import List, Optional, Dict, Any
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.models.portfolio import Portfolio, Holding
from app.services.market_data import market_data_service
import structlog

log = structlog.get_logger()

class PortfolioService:
    """Handles CRUD for portfolios and holdings, plus P&L logic."""

    async def get_portfolios(self, db: AsyncSession, user_id: int) -> List[Portfolio]:
        result = await db.execute(select(Portfolio).where(Portfolio.user_id == user_id))
        return list(result.scalars().all())

    async def create_portfolio(self, db: AsyncSession, user_id: int, name: str, description: str = "") -> Portfolio:
        portfolio = Portfolio(user_id=user_id, name=name, description=description)
        db.add(portfolio)
        await db.commit()
        await db.refresh(portfolio)
        return portfolio

    async def get_portfolio(self, db: AsyncSession, portfolio_id: int, user_id: int) -> Optional[Portfolio]:
        result = await db.execute(
            select(Portfolio)
            .where(Portfolio.id == portfolio_id, Portfolio.user_id == user_id)
            .options(selectinload(Portfolio.holdings))
        )
        return result.scalar_one_or_none()

    async def update_portfolio(self, db: AsyncSession, portfolio_id: int, user_id: int, **kwargs) -> Optional[Portfolio]:
        portfolio = await self.get_portfolio(db, portfolio_id, user_id)
        if not portfolio:
            return None
        for key, value in kwargs.items():
            if hasattr(portfolio, key):
                setattr(portfolio, key, value)
        await db.commit()
        await db.refresh(portfolio)
        return portfolio

    async def delete_portfolio(self, db: AsyncSession, portfolio_id: int, user_id: int) -> bool:
        portfolio = await self.get_portfolio(db, portfolio_id, user_id)
        if not portfolio:
            return False
        await db.delete(portfolio)
        await db.commit()
        return True

    async def add_holding(self, db: AsyncSession, portfolio_id: int, user_id: int, ticker: str, shares: Decimal, avg_cost: Decimal) -> Optional[Holding]:
        portfolio = await self.get_portfolio(db, portfolio_id, user_id)
        if not portfolio:
            return None
        
        holding = Holding(portfolio_id=portfolio_id, ticker=ticker.upper(), shares=shares, avg_cost=avg_cost)
        db.add(holding)
        await db.commit()
        await db.refresh(holding)
        return holding

    async def delete_holding(self, db: AsyncSession, portfolio_id: int, holding_id: int, user_id: int) -> bool:
        portfolio = await self.get_portfolio(db, portfolio_id, user_id)
        if not portfolio:
            return False
        
        result = await db.execute(delete(Holding).where(Holding.id == holding_id, Holding.portfolio_id == portfolio_id))
        await db.commit()
        return result.rowcount > 0

    async def calculate_pnl(self, db: AsyncSession, portfolio_id: int, user_id: int) -> Dict[str, Any]:
        """Calculate real-time P&L for a portfolio."""
        portfolio = await self.get_portfolio(db, portfolio_id, user_id)
        if not portfolio or not portfolio.holdings:
            return {"total_value": 0, "unrealized_pnl": 0, "holdings": []}

        holdings_data = []
        total_value = Decimal("0")
        total_cost = Decimal("0")

        # Fetch current prices for all tickers
        tickers = list(set(h.ticker for h in portfolio.holdings))
        prices = {}
        for ticker in tickers:
            try:
                quote = await market_data_service.get_quote(ticker)
                prices[ticker] = Decimal(str(quote.price))
            except Exception as e:
                log.error("pnl_price_fetch_error", ticker=ticker, error=str(e))
                prices[ticker] = Decimal("0")

        for h in portfolio.holdings:
            current_price = prices.get(h.ticker, Decimal("0"))
            market_value = current_price * h.shares
            cost_basis = h.avg_cost * h.shares
            unrealized_pnl = market_value - cost_basis
            pnl_pct = (unrealized_pnl / cost_basis * 100) if cost_basis else Decimal("0")

            total_value += market_value
            total_cost += cost_basis

            holdings_data.append({
                "ticker": h.ticker,
                "shares": float(h.shares),
                "avg_cost": float(h.avg_cost),
                "current_price": float(current_price),
                "market_value": float(market_value),
                "unrealized_pnl": float(unrealized_pnl),
                "pnl_pct": float(pnl_pct)
            })

        # Calculate allocation %
        for h_data in holdings_data:
            h_data["allocation_pct"] = float((Decimal(str(h_data["market_value"])) / total_value * 100)) if total_value else 0

        total_pnl = total_value - total_cost
        total_pnl_pct = (total_pnl / total_cost * 100) if total_cost else Decimal("0")

        return {
            "portfolio_name": portfolio.name,
            "total_value": float(total_value),
            "total_cost": float(total_cost),
            "unrealized_pnl": float(total_pnl),
            "pnl_pct": float(total_pnl_pct),
            "holdings": holdings_data
        }

portfolio_service = PortfolioService()
