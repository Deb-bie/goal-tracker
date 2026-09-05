from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import PeriodSummary
from app.services.analytics_service import get_period_summary

router = APIRouter(prefix="/analytics", tags=["analytics"])

Period = Literal["daily", "weekly", "monthly", "quarterly"]


@router.get("/summary", response_model=PeriodSummary)
def summary(
    period: Period = "daily",
    anchor_date: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Feedback summary for a day/week/month/quarter, anchored on any date within it.

    Defaults to `anchor_date=today`, e.g. `period=weekly` returns the summary
    for whichever week today falls in.
    """
    return get_period_summary(db, user.id, period, anchor_date or date.today())
