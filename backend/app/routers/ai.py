from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.database import get_db
from app.deps import get_current_user
from app.models import Goal, Milestone, MilestoneStatus, Todo, TodoStatus, User
from app.schemas import BreakdownRequest, GoalDetailOut, ReplanRequest
from app.services import groq_service

router = APIRouter(prefix="/goals", tags=["ai"])


def _goal_or_404(db: Session, goal_id: str, user: User) -> Goal:
    goal = db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found.")
    return goal


def _progress_pct(db: Session, goal_id: str) -> float:
    from sqlalchemy import func # type: ignore

    total = db.query(func.count(Todo.id)).filter(Todo.goal_id == goal_id).scalar() or 0
    if not total:
        return 0.0
    done = (
        db.query(func.count(Todo.id))
        .filter(Todo.goal_id == goal_id, Todo.status == TodoStatus.completed)
        .scalar()
        or 0
    )
    return round(done / total * 100.0, 1)


def _persist_plan(db: Session, goal: Goal, user: User, plan: dict, start_index: int = 0) -> None:
    for i, m in enumerate(plan.get("milestones", []), start=start_index):
        milestone = Milestone(
            goal_id=goal.id,
            title=m["title"],
            description=m.get("description"),
            order_index=i,
            due_date=date.fromisoformat(m["due_date"]),
        )
        db.add(milestone)
        db.flush()  # get milestone.id

        for t in m.get("todos", []):
            todo = Todo(
                user_id=user.id,
                goal_id=goal.id,
                milestone_id=milestone.id,
                title=t["title"],
                description=t.get("description"),
                priority=t.get("priority", "medium"),
                due_date=date.fromisoformat(t["due_date"]),
            )
            db.add(todo)


@router.post("/{goal_id}/breakdown", response_model=GoalDetailOut)
def breakdown_goal(
    goal_id: str,
    payload: BreakdownRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Ask the AI to break this goal into milestones + todos.

    Safe to call once per goal; calling again on a goal that already has an
    AI-generated plan raises a 400 (use /replan instead once work has started).
    """
    goal = _goal_or_404(db, goal_id, user)
    if goal.ai_generated_plan:
        raise HTTPException(
            status_code=400,
            detail="This goal already has an AI-generated plan. Use /replan to adjust it instead.",
        )

    timeframe = (payload.timeframe or goal.timeframe).value if hasattr(payload.timeframe or goal.timeframe, "value") else (payload.timeframe or goal.timeframe)

    try:
        plan = groq_service.generate_breakdown(
            goal_title=goal.title,
            goal_description=goal.description,
            timeframe=timeframe,
            granularity=payload.granularity,
            start_date=goal.start_date,
            extra_context=payload.extra_context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    _persist_plan(db, goal, user, plan)
    goal.ai_generated_plan = True

    if not goal.target_date:
        total_days = groq_service.TIMEFRAME_DAYS.get(timeframe, 30)
        goal.target_date = goal.start_date + timedelta(days=total_days)

    db.commit()
    db.refresh(goal)

    detail = GoalDetailOut.model_validate(goal)
    detail.progress_pct = _progress_pct(db, goal_id)
    return detail


@router.post("/{goal_id}/replan", response_model=GoalDetailOut)
def replan_goal(
    goal_id: str,
    payload: ReplanRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Regenerate the remaining (not-yet-completed) part of a goal's plan.

    Useful when you've fallen behind: completed todos/milestones are kept
    as history, everything still pending is replaced with a fresh plan for
    the time remaining.
    """
    goal = _goal_or_404(db, goal_id, user)

    completed_titles = [
        t.title for t in goal.todos if t.status == TodoStatus.completed
    ]
    pending_todos = [t for t in goal.todos if t.status == TodoStatus.pending]
    remaining_titles = [t.title for t in pending_todos]

    max_order = max((m.order_index for m in goal.milestones), default=-1)

    try:
        plan = groq_service.generate_replan(
            goal_title=goal.title,
            goal_description=goal.description,
            timeframe=goal.timeframe.value,
            granularity="weekly",
            today=date.today(),
            target_date=goal.target_date,
            completed_titles=completed_titles,
            remaining_titles=remaining_titles,
            reason=payload.reason,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Drop pending todos and not-yet-completed milestones, keep completed history.
    for t in pending_todos:
        db.delete(t)
    for m in list(goal.milestones):
        if m.status != MilestoneStatus.completed:
            db.delete(m)
    db.flush()

    _persist_plan(db, goal, user, plan, start_index=max_order + 1)
    goal.ai_generated_plan = True
    db.commit()
    db.refresh(goal)

    detail = GoalDetailOut.model_validate(goal)
    detail.progress_pct = _progress_pct(db, goal_id)
    return detail
