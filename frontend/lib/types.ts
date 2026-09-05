export type Timeframe =
  | "1_week"
  | "2_weeks"
  | "1_month"
  | "3_months"
  | "6_months"
  | "1_year"
  | "custom";

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "1_week": "1 week",
  "2_weeks": "2 weeks",
  "1_month": "1 month",
  "3_months": "3 months",
  "6_months": "6 months",
  "1_year": "1 year",
  custom: "Custom",
};

export type GoalStatus = "active" | "completed" | "archived";
export type MilestoneStatus = "pending" | "in_progress" | "completed";
export type TodoStatus = "pending" | "completed";
export type Priority = "low" | "medium" | "high";
export type RecurrenceRule = "none" | "daily" | "weekly" | "monthly";
export type Period = "daily" | "weekly" | "monthly" | "quarterly";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  timezone: string;
  created_at: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TodoStatus;
  due_date: string | null;
  completed_at: string | null;
  recurrence: RecurrenceRule;
  goal_id: string | null;
  milestone_id: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  due_date: string | null;
  status: MilestoneStatus;
  todos: Todo[];
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  timeframe: Timeframe;
  start_date: string;
  target_date: string | null;
  status: GoalStatus;
  ai_generated_plan: boolean;
  created_at: string;
}

export interface GoalListItem extends Goal {
  progress_pct: number;
  todos_completed: number;
  todos_total: number;
}

export interface GoalDetail extends Goal {
  milestones: Milestone[];
  todos: Todo[];
  progress_pct: number;
}

export interface GoalProgress {
  goal_id: string;
  title: string;
  progress_pct: number;
  todos_completed: number;
  todos_total: number;
  status: GoalStatus;
}

export interface CalendarFeed {
  url_path: string;
}

export interface PeriodSummary {
  period: Period;
  range_start: string;
  range_end: string;
  todos_due: number;
  todos_completed: number;
  todos_completed_late_or_extra: number;
  completion_rate: number;
  previous_completion_rate: number | null;
  trend_pct_points: number | null;
  current_streak_days: number;
  longest_streak_days: number;
  goal_progress: GoalProgress[];
  daily_breakdown: { date: string; due: number; completed: number }[];
}
