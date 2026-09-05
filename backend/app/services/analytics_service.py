from datetime import date, timedelta

from sqlalchemy import func # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.models import DailyStreak, Goal, GoalStatus, Milestone, Todo, TodoStatus
from app.schemas import GoalProgress, PeriodSummary



# ---------------------------------------------------------------------------
# Streak bookkeeping — called whenever a todo's completion state changes.
# ---------------------------------------------------------------------------


def bump_streak_day(db: Session, user_id: str, day: date, delta: int) -> None:
    """Increment/decrement the completed-todo counter for a given day.

    A row only exists for days that have at least one completion; we delete
    it once the count drops back to zero so streak math stays simple.
    """
    row = db.query(DailyStreak).filter(DailyStreak.user_id == user_id, DailyStreak.day == day).first()
    if row is None:
        if delta <= 0:
            return
        row = DailyStreak(user_id=user_id, day=day, completed_count=delta)
        db.add(row)
        return

    row.completed_count = max(0, row.completed_count + delta)
    if row.completed_count == 0:
        db.delete(row)


def compute_streaks(db: Session, user_id: str, as_of: date) -> tuple[int, int]:
    """Returns (current_streak_days, longest_streak_days) as of the given date."""
    days = (
        db.query(DailyStreak.day)
        .filter(DailyStreak.user_id == user_id, DailyStreak.day <= as_of)
        .order_by(DailyStreak.day.asc())
        .all()
    )
    day_set = {d[0] for d in days}
    if not day_set:
        return 0, 0

    # Current streak: walk backwards from as_of (or from the most recent
    # completed day if today has none yet).
    current = 0
    cursor = as_of
    if cursor not in day_set:
        cursor -= timedelta(days=1)
    while cursor in day_set:
        current += 1
        cursor -= timedelta(days=1)

    # Longest streak: scan the sorted set once.
    longest = 0
    run = 0
    prev = None
    for d in sorted(day_set):
        if prev is not None and d == prev + timedelta(days=1):
            run += 1
        else:
            run = 1
        longest = max(longest, run)
        prev = d

    return current, longest




# ---------------------------------------------------------------------------
# Period summaries (daily / weekly / monthly / quarterly)
# ---------------------------------------------------------------------------


def _period_range(period: str, anchor: date) -> tuple[date, date]:
    if period == "daily":
        return anchor, anchor
    if period == "weekly":
        start = anchor - timedelta(days=anchor.weekday())  # Monday
        return start, start + timedelta(days=6)
    if period == "monthly":
        start = anchor.replace(day=1)
        if start.month == 12:
            next_month = start.replace(year=start.year + 1, month=1)
        else:
            next_month = start.replace(month=start.month + 1)
        return start, next_month - timedelta(days=1)
    if period == "quarterly":
        quarter_index = (anchor.month - 1) // 3
        start_month = quarter_index * 3 + 1
        start = anchor.replace(month=start_month, day=1)
        end_month = start_month + 2
        if end_month == 12:
            next_period = start.replace(year=start.year + 1, month=1, day=1)
        else:
            next_period = start.replace(month=end_month + 1, day=1)
        return start, next_period - timedelta(days=1)
    raise ValueError(f"Unknown period '{period}'. Use daily, weekly, monthly, or quarterly.")


def _previous_range(period: str, range_start: date) -> tuple[date, date]:
    if period == "daily":
        prev_anchor = range_start - timedelta(days=1)
    elif period == "weekly":
        prev_anchor = range_start - timedelta(days=7)
    elif period == "monthly":
        prev_anchor = (range_start - timedelta(days=1)).replace(day=1)
    else:  # quarterly
        prev_anchor = range_start - timedelta(days=1)
    return _period_range(period, prev_anchor)


def _completion_rate(db: Session, user_id: str, start: date, end: date) -> tuple[int, int, float]:
    due_count = (
        db.query(func.count(Todo.id))
        .filter(Todo.user_id == user_id, Todo.due_date.isnot(None), Todo.due_date >= start, Todo.due_date <= end)
        .scalar()
        or 0
    )
    completed_count = (
        db.query(func.count(Todo.id))
        .filter(
            Todo.user_id == user_id,
            Todo.due_date.isnot(None),
            Todo.due_date >= start,
            Todo.due_date <= end,
            Todo.status == TodoStatus.completed,
        )
        .scalar()
        or 0
    )
    rate = (completed_count / due_count * 100.0) if due_count else 0.0
    return due_count, completed_count, rate


def get_period_summary(db: Session, user_id: str, period: str, anchor: date) -> PeriodSummary:
    start, end = _period_range(period, anchor)
    prev_start, prev_end = _previous_range(period, start)

    due_count, completed_count, rate = _completion_rate(db, user_id, start, end)
    _, _, prev_rate = _completion_rate(db, user_id, prev_start, prev_end)

    # Todos completed in-range that either had no due date or were completed
    # outside the strict "due in this period" set (e.g. finished early/late).
    completed_in_range_total = (
        db.query(func.count(Todo.id))
        .filter(
            Todo.user_id == user_id,
            Todo.completed_at.isnot(None),
            func.date(Todo.completed_at) >= start,
            func.date(Todo.completed_at) <= end,
        )
        .scalar()
        or 0
    )
    extra = max(0, completed_in_range_total - completed_count)

    current_streak, longest_streak = compute_streaks(db, user_id, min(end, date.today()))

    trend = None
    if prev_rate is not None:
        trend = round(rate - prev_rate, 1)

    # Per-goal progress for goals active/touched during this window.
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == user_id, Goal.status != GoalStatus.archived)
        .all()
    )
    goal_progress: list[GoalProgress] = []
    for goal in goals:
        total = db.query(func.count(Todo.id)).filter(Todo.goal_id == goal.id).scalar() or 0
        done = (
            db.query(func.count(Todo.id))
            .filter(Todo.goal_id == goal.id, Todo.status == TodoStatus.completed)
            .scalar()
            or 0
        )
        pct = round((done / total * 100.0), 1) if total else 0.0
        goal_progress.append(
            GoalProgress(
                goal_id=goal.id,
                title=goal.title,
                progress_pct=pct,
                todos_completed=done,
                todos_total=total,
                status=goal.status,
            )
        )
    goal_progress.sort(key=lambda g: g.progress_pct, reverse=True)

    # Day-by-day breakdown across the range for charting.
    daily_breakdown = []
    cursor = start
    while cursor <= end:
        day_due = (
            db.query(func.count(Todo.id))
            .filter(Todo.user_id == user_id, Todo.due_date == cursor)
            .scalar()
            or 0
        )
        day_done = (
            db.query(func.count(Todo.id))
            .filter(Todo.user_id == user_id, Todo.due_date == cursor, Todo.status == TodoStatus.completed)
            .scalar()
            or 0
        )
        daily_breakdown.append({"date": cursor.isoformat(), "due": day_due, "completed": day_done})
        cursor += timedelta(days=1)

    return PeriodSummary(
        period=period,
        range_start=start,
        range_end=end,
        todos_due=due_count,
        todos_completed=completed_count,
        todos_completed_late_or_extra=extra,
        completion_rate=round(rate, 1),
        previous_completion_rate=round(prev_rate, 1) if due_count or prev_rate else prev_rate,
        trend_pct_points=trend,
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        goal_progress=goal_progress,
        daily_breakdown=daily_breakdown,
    )
