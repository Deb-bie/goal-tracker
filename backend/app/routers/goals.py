from datetime import date

from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy import func # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.database import get_db
from app.deps import get_current_user
from app.models import Goal, GoalStatus, Milestone, Todo, TodoStatus, User
from app.schemas import (
    GoalCreate,
    GoalDetailOut,
    GoalListOut,
    GoalOut,
    GoalUpdate,
    MilestoneCreate,
    MilestoneOut,
    MilestoneUpdate,
)

router = APIRouter(prefix="/goals", tags=["goals"])


def _goal_or_404(db: Session, goal_id: str, user: User) -> Goal:
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return goal


def _progress_counts(db: Session, goal_id: str) -> tuple[int, int, float]:
    total = db.query(func.count(Todo.id)).filter(Todo.goal_id == goal_id).scalar() or 0
    if not total:
        return 0, 0, 0.0
    done = (
        db.query(func.count(Todo.id))
        .filter(Todo.goal_id == goal_id, Todo.status == TodoStatus.completed)
        .scalar()
        or 0
    )
    return done, total, round(done / total * 100.0, 1)


def _progress_pct(db: Session, goal_id: str) -> float:
    return _progress_counts(db, goal_id)[2]


@router.get("", response_model=list[GoalListOut])
def list_goals(
    status_filter: GoalStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Goal).filter(Goal.user_id == user.id)
    if status_filter:
        query = query.filter(Goal.status == status_filter)
    goals = query.order_by(Goal.created_at.desc()).all()

    results = []
    for goal in goals:
        done, total, pct = _progress_counts(db, goal.id)
        item = GoalListOut.model_validate(goal)
        item.todos_completed = done
        item.todos_total = total
        item.progress_pct = pct
        results.append(item)
    return results


@router.post("", response_model=GoalOut, status_code=201)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = Goal(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        timeframe=payload.timeframe,
        start_date=payload.start_date or date.today(),
        target_date=payload.target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/{goal_id}", response_model=GoalDetailOut)
def get_goal(goal_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = _goal_or_404(db, goal_id, user)
    detail = GoalDetailOut.model_validate(goal)
    detail.progress_pct = _progress_pct(db, goal_id)
    return detail


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: str, payload: GoalUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    goal = _goal_or_404(db, goal_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = _goal_or_404(db, goal_id, user)
    db.delete(goal)
    db.commit()
    return None


# ---------- Milestones ----------


def _milestone_or_404(db: Session, goal_id: str, milestone_id: str) -> Milestone:
    milestone = db.get(Milestone, milestone_id)
    if not milestone or milestone.goal_id != goal_id:
        raise HTTPException(status_code=404, detail="Milestone not found.")
    return milestone


@router.post("/{goal_id}/milestones", response_model=MilestoneOut, status_code=201)
def create_milestone(
    goal_id: str,
    payload: MilestoneCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Manually add a milestone to a goal — e.g. to extend or fill a gap in
    an AI-generated plan, or to build a plan by hand without the AI at all."""
    _goal_or_404(db, goal_id, user)
    max_order = db.query(func.max(Milestone.order_index)).filter(Milestone.goal_id == goal_id).scalar()
    milestone = Milestone(
        goal_id=goal_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        order_index=(max_order + 1) if max_order is not None else 0,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.patch("/{goal_id}/milestones/{milestone_id}", response_model=MilestoneOut)
def update_milestone(
    goal_id: str,
    milestone_id: str,
    payload: MilestoneUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Edit a milestone's title/description/due date/status/order — this is
    how you tweak an AI-suggested milestone rather than accepting it as-is."""
    _goal_or_404(db, goal_id, user)
    milestone = _milestone_or_404(db, goal_id, milestone_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/{goal_id}/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    goal_id: str, milestone_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _goal_or_404(db, goal_id, user)
    milestone = _milestone_or_404(db, goal_id, milestone_id)
    db.delete(milestone)
    db.commit()
    return None
