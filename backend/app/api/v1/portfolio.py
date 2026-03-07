"""Portfolio API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.portfolio import (
    PortfolioCreate, 
    PortfolioResponse, 
    PortfolioPnL, 
    HoldingCreate
)
from app.services.portfolio import portfolio_service

router = APIRouter()

@router.get("/", response_model=List[PortfolioResponse])
async def list_portfolios(
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await portfolio_service.get_portfolios(db, current_user)

@router.post("/", response_model=PortfolioResponse)
async def create_portfolio(
    portfolio_in: PortfolioCreate,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await portfolio_service.create_portfolio(
        db, current_user, portfolio_in.name, portfolio_in.description
    )

@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    portfolio = await portfolio_service.get_portfolio(db, portfolio_id, current_user)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_in: PortfolioCreate,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    portfolio = await portfolio_service.update_portfolio(
        db, portfolio_id, current_user, **portfolio_in.model_dump()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.delete("/{portfolio_id}")
async def delete_portfolio(
    portfolio_id: int,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await portfolio_service.delete_portfolio(db, portfolio_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {"detail": "Portfolio deleted"}

@router.post("/{portfolio_id}/holdings", response_model=dict)
async def add_holding(
    portfolio_id: int,
    holding_in: HoldingCreate,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    holding = await portfolio_service.add_holding(
        db, portfolio_id, current_user, 
        holding_in.ticker, holding_in.shares, holding_in.avg_cost
    )
    if not holding:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    # Return as dict for simple response, or create HoldingResponse
    return {"detail": "Holding added", "id": holding.id}

@router.delete("/{portfolio_id}/holdings/{holding_id}")
async def delete_holding(
    portfolio_id: int,
    holding_id: int,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await portfolio_service.delete_holding(db, portfolio_id, holding_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"detail": "Holding deleted"}

@router.get("/{portfolio_id}/pnl", response_model=PortfolioPnL)
async def get_portfolio_pnl(
    portfolio_id: int,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await portfolio_service.calculate_pnl(db, portfolio_id, current_user)
