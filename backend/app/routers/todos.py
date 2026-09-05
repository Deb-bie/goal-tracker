from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.database import get_db
from app.deps import get_current_user
from app.models import Goal, Milestone, RecurrenceRule, Todo, TodoStatus, User
from app.schemas import TodoCreate, TodoOut, TodoUpdate
from app.services.analytics_service import bump_streak_day

router = APIRouter(prefix="/todos", tags=["todos"])


def _todo_or_404(db: Session, todo_id: str, user: User) -> Todo:
    todo = db.get(Todo, todo_id)
    if not todo or todo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Todo not found.")
    return todo


def _validate_goal_and_milestone(db: Session, user: User, goal_id: str | None, milestone_id: str | None) -> None:
    if goal_id:
        goal = db.get(Goal, goal_id)
        if not goal or goal.user_id != user.id:
            raise HTTPException(status_code=404, detail="Goal not found.")
    if milestone_id:
        milestone = db.get(Milestone, milestone_id)
        if not milestone or (goal_id and milestone.goal_id != goal_id):
            raise HTTPException(status_code=404, detail="Milestone not found for this goal.")


def _next_due_date(current: date, recurrence: RecurrenceRule) -> date | None:
    if recurrence == RecurrenceRule.daily:
        return current + timedelta(days=1)
    if recurrence == RecurrenceRule.weekly:
        return current + timedelta(days=7)
    if recurrence == RecurrenceRule.monthly:
        month = current.month + 1
        year = current.year + (1 if month > 12 else 0)
        month = month if month <= 12 else 1
        day = min(current.day, 28)
        return date(year, month, day)
    return None


@router.get("", response_model=list[TodoOut])
def list_todos(
    status_filter: TodoStatus | None = None,
    goal_id: str | None = None,
    due_before: date | None = None,
    due_after: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Todo).filter(Todo.user_id == user.id)
    if status_filter:
        query = query.filter(Todo.status == status_filter)
    if goal_id:
        query = query.filter(Todo.goal_id == goal_id)
    if due_before:
        query = query.filter(Todo.due_date <= due_before)
    if due_after:
        query = query.filter(Todo.due_date >= due_after)
    return query.order_by(Todo.due_date.asc().nulls_last(), Todo.created_at.desc()).all()


@router.post("", response_model=TodoOut, status_code=201)
def create_todo(payload: TodoCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _validate_goal_and_milestone(db, user, payload.goal_id, payload.milestone_id)
    todo = Todo(user_id=user.id, **payload.model_dump())
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.patch("/{todo_id}", response_model=TodoOut)
def update_todo(
    todo_id: str, payload: TodoUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    todo = _todo_or_404(db, todo_id, user)
    data = payload.model_dump(exclude_unset=True)

    if "goal_id" in data or "milestone_id" in data:
        _validate_goal_and_milestone(
            db, user, data.get("goal_id", todo.goal_id), data.get("milestone_id", todo.milestone_id)
        )

    going_to_complete = data.get("status") == TodoStatus.completed and todo.status != TodoStatus.completed
    going_to_reopen = data.get("status") == TodoStatus.pending and todo.status == TodoStatus.completed

    for field, value in data.items():
        setattr(todo, field, value)

    next_todo = None
    if going_to_complete:
        todo.completed_at = datetime.utcnow()
        bump_streak_day(db, user.id, todo.completed_at.date(), +1)

        if todo.recurrence != RecurrenceRule.none and todo.due_date:
            next_due = _next_due_date(todo.due_date, todo.recurrence)
            next_todo = Todo(
                user_id=user.id,
                goal_id=todo.goal_id,
                milestone_id=todo.milestone_id,
                title=todo.title,
                description=todo.description,
                priority=todo.priority,
                due_date=next_due,
                recurrence=todo.recurrence,
            )
            db.add(next_todo)
    elif going_to_reopen and todo.completed_at:
        bump_streak_day(db, user.id, todo.completed_at.date(), -1)
        todo.completed_at = None

    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    todo = _todo_or_404(db, todo_id, user)
    if todo.status == TodoStatus.completed and todo.completed_at:
        bump_streak_day(db, user.id, todo.completed_at.date(), -1)
    db.delete(todo)
    db.commit()
    return None
