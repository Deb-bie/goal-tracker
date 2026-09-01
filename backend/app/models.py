import enum
import uuid
from datetime import date, datetime

from sqlalchemy import ( # type: ignore
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship # type: ignore

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class GoalStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class MilestoneStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class TodoStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class RecurrenceRule(str, enum.Enum):
    none = "none"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class Timeframe(str, enum.Enum):
    """How long the user wants to give themselves to hit a goal."""

    one_week = "1_week"
    two_weeks = "2_weeks"
    one_month = "1_month"
    three_months = "3_months"
    six_months = "6_months"
    one_year = "1_year"
    custom = "custom"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    timezone: Mapped[str] = mapped_column(String, default="UTC", nullable=False)
    calendar_token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    goals: Mapped[list["Goal"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    todos: Mapped[list["Todo"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String, nullable=True)

    timeframe: Mapped[Timeframe] = mapped_column(Enum(Timeframe), default=Timeframe.one_month)
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    target_date: Mapped[date] = mapped_column(Date, nullable=True)

    status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus), default=GoalStatus.active)
    ai_generated_plan: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner: Mapped["User"] = relationship(back_populates="goals")
    milestones: Mapped[list["Milestone"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan", order_by="Milestone.order_index"
    )
    todos: Mapped[list["Todo"]] = relationship(back_populates="goal", cascade="all, delete-orphan")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    goal_id: Mapped[str] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), index=True)

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    due_date: Mapped[date] = mapped_column(Date, nullable=True)
    status: Mapped[MilestoneStatus] = mapped_column(Enum(MilestoneStatus), default=MilestoneStatus.pending)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    goal: Mapped["Goal"] = relationship(back_populates="milestones")
    todos: Mapped[list["Todo"]] = relationship(back_populates="milestone", cascade="all, delete-orphan")


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    goal_id: Mapped[str | None] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), nullable=True, index=True)
    milestone_id: Mapped[str | None] = mapped_column(
        ForeignKey("milestones.id", ondelete="CASCADE"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.medium)
    status: Mapped[TodoStatus] = mapped_column(Enum(TodoStatus), default=TodoStatus.pending, index=True)

    due_date: Mapped[date] = mapped_column(Date, nullable=True, index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True, index=True)

    recurrence: Mapped[RecurrenceRule] = mapped_column(Enum(RecurrenceRule), default=RecurrenceRule.none)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner: Mapped["User"] = relationship(back_populates="todos")
    goal: Mapped["Goal"] = relationship(back_populates="todos")
    milestone: Mapped["Milestone"] = relationship(back_populates="todos")


class DailyStreak(Base):
    """One row per user per calendar day that had >=1 completed todo.

    Used to compute streaks cheaply without re-scanning all todos every time.
    """

    __tablename__ = "daily_streaks"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_user_day"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
