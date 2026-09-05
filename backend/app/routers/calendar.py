import secrets

from fastapi import APIRouter, Depends, HTTPException, Response # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.database import get_db
from app.deps import get_current_user
from app.models import Goal, Milestone, Todo, User
from app.schemas import CalendarFeedOut
from app.services.ics_service import build_feed, generate_token

router = APIRouter(tags=["calendar"])


def _feed_out(user: User) -> CalendarFeedOut:
    return CalendarFeedOut(url_path=f"/calendar/{user.id}/{user.calendar_token}.ics")


@router.get("/users/me/calendar-feed", response_model=CalendarFeedOut)
def get_calendar_feed(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the user's subscribable calendar feed URL, creating a token if needed."""
    if not current_user.calendar_token:
        current_user.calendar_token = generate_token()
        db.commit()
        db.refresh(current_user)
    return _feed_out(current_user)


@router.post("/users/me/calendar-feed/regenerate", response_model=CalendarFeedOut)
def regenerate_calendar_feed(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Issue a new token, invalidating any previously-subscribed feed URL."""
    current_user.calendar_token = generate_token()
    db.commit()
    db.refresh(current_user)
    return _feed_out(current_user)


@router.get("/calendar/{user_id}/{token}.ics")
def calendar_feed(user_id: str, token: str, db: Session = Depends(get_db)):
    """Public, token-gated .ics feed — no bearer auth, since calendar apps fetch this
    URL directly (and on their own refresh schedule) rather than through the frontend."""
    user = db.get(User, user_id)
    if not user or not user.calendar_token or not secrets.compare_digest(user.calendar_token, token):
        raise HTTPException(status_code=404, detail="Calendar feed not found.")

    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    milestones = (
        db.query(Milestone)
        .join(Goal, Milestone.goal_id == Goal.id)
        .filter(Goal.user_id == user.id)
        .all()
    )
    todos = db.query(Todo).filter(Todo.user_id == user.id).all()

    ics_text = build_feed(user, goals, milestones, todos)
    return Response(
        content=ics_text,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'inline; filename="goal-tracker.ics"'},
    )
