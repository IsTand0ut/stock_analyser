"""Price alerts API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.alert import AlertCreate, AlertResponse
from app.models.alert import PriceAlert

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PriceAlert).where(PriceAlert.user_id == current_user))
    return list(result.scalars().all())

@router.post("/", response_model=AlertResponse)
async def create_alert(
    alert_in: AlertCreate,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    alert = PriceAlert(
        user_id=current_user,
        ticker=alert_in.ticker.upper(),
        direction=alert_in.direction,
        target_price=alert_in.target_price
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == current_user)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.delete(alert)
    await db.commit()
    return {"detail": "Alert deleted"}

@router.put("/{alert_id}/toggle", response_model=AlertResponse)
async def toggle_alert(
    alert_id: int,
    current_user: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == current_user)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_active = not alert.is_active
    await db.commit()
    await db.refresh(alert)
    return alert
