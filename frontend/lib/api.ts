import type {
  Goal,
  GoalDetail,
  GoalListItem,
  Milestone,
  MilestoneStatus,
  Period,
  PeriodSummary,
  Timeframe,
  Todo,
  TodoStatus,
  User,
  CalendarFeed,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TOKEN_KEY = "goal_tracker_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = body?.detail || res.statusText || "Request failed";
    throw new ApiError(typeof message === "string" ? message : JSON.stringify(message), res.status);
  }

  return body as T;
}

// ---------- Auth ----------

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login/json", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<User>("/auth/me"),
};

// ---------- Goals ----------

export const goalsApi = {
  list: (statusFilter?: string) =>
    request<GoalListItem[]>(`/goals${statusFilter ? `?status_filter=${statusFilter}` : ""}`),
  get: (id: string) => request<GoalDetail>(`/goals/${id}`),
  create: (data: {
    title: string;
    description?: string;
    category?: string;
    timeframe: Timeframe;
    target_date?: string;
  }) => request<Goal>("/goals", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Goal>) =>
    request<Goal>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/goals/${id}`, { method: "DELETE" }),
  breakdown: (
    id: string,
    data: { timeframe?: Timeframe; granularity?: string; extra_context?: string }
  ) => request<GoalDetail>(`/goals/${id}/breakdown`, { method: "POST", body: JSON.stringify(data) }),
  replan: (id: string, data: { reason?: string }) =>
    request<GoalDetail>(`/goals/${id}/replan`, { method: "POST", body: JSON.stringify(data) }),
  createMilestone: (goalId: string, data: { title: string; description?: string; due_date?: string }) =>
    request<Milestone>(`/goals/${goalId}/milestones`, { method: "POST", body: JSON.stringify(data) }),
  updateMilestone: (
    goalId: string,
    milestoneId: string,
    data: {
      title?: string;
      description?: string;
      due_date?: string | null;
      status?: MilestoneStatus;
      order_index?: number;
    }
  ) =>
    request<Milestone>(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteMilestone: (goalId: string, milestoneId: string) =>
    request<void>(`/goals/${goalId}/milestones/${milestoneId}`, { method: "DELETE" }),
};

// ---------- Todos ----------

export const todosApi = {
  list: (params?: { status?: TodoStatus; goal_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status_filter", params.status);
    if (params?.goal_id) qs.set("goal_id", params.goal_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Todo[]>(`/todos${suffix}`);
  },
  create: (data: {
    title: string;
    description?: string;
    priority?: string;
    due_date?: string;
    goal_id?: string;
    milestone_id?: string;
    recurrence?: string;
  }) => request<Todo>("/todos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Todo>) =>
    request<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/todos/${id}`, { method: "DELETE" }),
  toggleComplete: (todo: Todo) =>
    request<Todo>(`/todos/${todo.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: todo.status === "completed" ? "pending" : "completed" }),
    }),
};

// ---------- Analytics ----------

export const analyticsApi = {
  summary: (period: Period, anchorDate?: string) => {
    const qs = new URLSearchParams({ period });
    if (anchorDate) qs.set("anchor_date", anchorDate);
    return request<PeriodSummary>(`/analytics/summary?${qs.toString()}`);
  },
};

// ---------- Calendar ----------

export const calendarApi = {
  getFeed: () => request<CalendarFeed>("/users/me/calendar-feed"),
  regenerate: () => request<CalendarFeed>("/users/me/calendar-feed/regenerate", { method: "POST" }),
};
