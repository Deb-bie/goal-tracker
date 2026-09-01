from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field # type: ignore

from app.models import GoalStatus, MilestoneStatus, Priority, RecurrenceRule, Timeframe, TodoStatus

# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str | None = None
    timezone: str = "UTC"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None
    timezone: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Todos ----------
class TodoBase(BaseModel):
    title: str
    description: str | None = None
    priority: Priority = Priority.medium
    due_date: date | None = None
    recurrence: RecurrenceRule = RecurrenceRule.none
    goal_id: str | None = None
    milestone_id: str | None = None


class TodoCreate(TodoBase):
    pass


class TodoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: Priority | None = None
    due_date: date | None = None
    recurrence: RecurrenceRule | None = None
    status: TodoStatus | None = None
    goal_id: str | None = None
    milestone_id: str | None = None


class TodoOut(TodoBase):
    id: str
    status: TodoStatus
    completed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Milestones ----------
class MilestoneCreate(BaseModel):
    title: str
    description: str | None = None
    due_date: date | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: date | None = None
    status: MilestoneStatus | None = None
    order_index: int | None = None


class MilestoneOut(BaseModel):
    id: str
    title: str
    description: str | None
    order_index: int
    due_date: date | None
    status: MilestoneStatus
    todos: list[TodoOut] = []

    class Config:
        from_attributes = True




# ---------- Goals ----------
class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    timeframe: Timeframe = Timeframe.one_month
    start_date: date | None = None
    target_date: date | None = None


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    timeframe: Timeframe | None = None
    target_date: date | None = None
    status: GoalStatus | None = None


class GoalOut(BaseModel):
    id: str
    title: str
    description: str | None
    category: str | None
    timeframe: Timeframe
    start_date: date
    target_date: date | None
    status: GoalStatus
    ai_generated_plan: bool
    created_at: datetime

    class Config:
        from_attributes = True


class GoalListOut(GoalOut):
    progress_pct: float = 0.0
    todos_completed: int = 0
    todos_total: int = 0


class GoalDetailOut(GoalOut):
    milestones: list[MilestoneOut] = []
    todos: list[TodoOut] = []
    progress_pct: float = 0.0




# ---------- AI breakdown ----------
class BreakdownRequest(BaseModel):
    timeframe: Timeframe | None = None
    granularity: str = Field(
        default="weekly",
        description="How finely to chunk the plan: 'daily', 'weekly', or 'monthly'.",
    )
    extra_context: str | None = Field(
        default=None, description="Anything else the AI should know: constraints, available time, etc."
    )


class ReplanRequest(BaseModel):
    reason: str | None = Field(
        default=None, description="Why you're behind / what changed, e.g. 'missed two weeks'."
    )


# ---------- Calendar ----------


class CalendarFeedOut(BaseModel):
    url_path: str





# ---------- Analytics ----------


class GoalProgress(BaseModel):
    goal_id: str
    title: str
    progress_pct: float
    todos_completed: int
    todos_total: int
    status: GoalStatus


class PeriodSummary(BaseModel):
    period: str
    range_start: date
    range_end: date
    todos_due: int
    todos_completed: int
    todos_completed_late_or_extra: int
    completion_rate: float
    previous_completion_rate: float | None
    trend_pct_points: float | None
    current_streak_days: int
    longest_streak_days: int
    goal_progress: list[GoalProgress]
    daily_breakdown: list[dict]
