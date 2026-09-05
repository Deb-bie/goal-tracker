"""baseline schema

Revision ID: 533af3c549ad
Revises: 
Create Date: 2026-09-05 04:04:11.735553

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '533af3c549ad'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('users',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('full_name', sa.String(), nullable=True),
    sa.Column('timezone', sa.String(), nullable=False),
    sa.Column('calendar_token', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_calendar_token'), 'users', ['calendar_token'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_table('daily_streaks',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('day', sa.Date(), nullable=False),
    sa.Column('completed_count', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'day', name='uq_user_day')
    )
    op.create_index(op.f('ix_daily_streaks_user_id'), 'daily_streaks', ['user_id'], unique=False)
    op.create_table('goals',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('category', sa.String(), nullable=True),
    sa.Column('timeframe', sa.Enum('one_week', 'two_weeks', 'one_month', 'three_months', 'six_months', 'one_year', 'custom', name='timeframe'), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('target_date', sa.Date(), nullable=True),
    sa.Column('status', sa.Enum('active', 'completed', 'archived', name='goalstatus'), nullable=False),
    sa.Column('ai_generated_plan', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_goals_user_id'), 'goals', ['user_id'], unique=False)
    op.create_table('milestones',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('goal_id', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('status', sa.Enum('pending', 'in_progress', 'completed', name='milestonestatus'), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_milestones_goal_id'), 'milestones', ['goal_id'], unique=False)
    op.create_table('todos',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('goal_id', sa.String(), nullable=True),
    sa.Column('milestone_id', sa.String(), nullable=True),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('priority', sa.Enum('low', 'medium', 'high', name='priority'), nullable=False),
    sa.Column('status', sa.Enum('pending', 'completed', name='todostatus'), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.Column('recurrence', sa.Enum('none', 'daily', 'weekly', 'monthly', name='recurrencerule'), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['milestone_id'], ['milestones.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_todos_completed_at'), 'todos', ['completed_at'], unique=False)
    op.create_index(op.f('ix_todos_due_date'), 'todos', ['due_date'], unique=False)
    op.create_index(op.f('ix_todos_goal_id'), 'todos', ['goal_id'], unique=False)
    op.create_index(op.f('ix_todos_milestone_id'), 'todos', ['milestone_id'], unique=False)
    op.create_index(op.f('ix_todos_status'), 'todos', ['status'], unique=False)
    op.create_index(op.f('ix_todos_user_id'), 'todos', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_todos_user_id'), table_name='todos')
    op.drop_index(op.f('ix_todos_status'), table_name='todos')
    op.drop_index(op.f('ix_todos_milestone_id'), table_name='todos')
    op.drop_index(op.f('ix_todos_goal_id'), table_name='todos')
    op.drop_index(op.f('ix_todos_due_date'), table_name='todos')
    op.drop_index(op.f('ix_todos_completed_at'), table_name='todos')
    op.drop_table('todos')
    op.drop_index(op.f('ix_milestones_goal_id'), table_name='milestones')
    op.drop_table('milestones')
    op.drop_index(op.f('ix_goals_user_id'), table_name='goals')
    op.drop_table('goals')
    op.drop_index(op.f('ix_daily_streaks_user_id'), table_name='daily_streaks')
    op.drop_table('daily_streaks')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_calendar_token'), table_name='users')
    op.drop_table('users')