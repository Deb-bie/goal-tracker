"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, PartyPopper, Sparkles, Target } from "lucide-react";
import { goalsApi, todosApi } from "@/lib/api";
import type { GoalListItem, Todo } from "@/lib/types";
import TodoItem from "./TodoItem";

export default function TodayFocus() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [allTodos, allGoals] = await Promise.all([
        todosApi.list(),
        goalsApi.list("active"),
      ]);
      setTodos(allTodos.filter((t) => t.due_date && t.due_date <= today));
      setGoals(allGoals);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(todo: Todo) {
    await todosApi.toggleComplete(todo);
    load();
  }

  async function handleDelete(todo: Todo) {
    await todosApi.remove(todo.id);
    load();
  }

  async function handleUpdate(todo: Todo, data: Partial<Todo>) {
    await todosApi.update(todo.id, data);
    load();
  }

  const goalTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    goals.forEach((g) => (map[g.id] = g.title));
    return map;
  }, [goals]);

  const groups = useMemo(() => {
    const byGoal = new Map<string, Todo[]>();
    const standalone: Todo[] = [];
    for (const t of todos) {
      if (t.goal_id) {
        if (!byGoal.has(t.goal_id)) byGoal.set(t.goal_id, []);
        byGoal.get(t.goal_id)!.push(t);
      } else {
        standalone.push(t);
      }
    }
    return { byGoal, standalone };
  }, [todos]);

  const pendingCount = todos.filter((t) => t.status === "pending").length;

  if (loading) {
    return (
      <div className="card">
        <p className="text-slate-400">Loading today&apos;s plan…</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="card flex flex-col items-center py-10 text-center">
        <span className="icon-badge mb-3 h-12 w-12 rounded-2xl">
          <Sparkles size={22} strokeWidth={2.25} />
        </span>
        <p className="font-display font-semibold text-slate-800">Nothing due today</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Open a goal and generate an AI plan, or add a todo, to see what to work on today.
        </p>
        <Link href="/goals" className="btn-primary mt-4 !py-1.5 text-sm">
          Go to goals
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display font-semibold text-slate-800">
          <Target size={17} className="text-brand-600" />
          Today&apos;s focus
        </h2>
        {pendingCount === 0 ? (
          <span className="badge bg-emerald-50 text-emerald-700">
            <PartyPopper size={12} /> All done
          </span>
        ) : (
          <span className="badge bg-brand-50 text-brand-700">{pendingCount} left</span>
        )}
      </div>

      <div className="space-y-5">
        {Array.from(groups.byGoal.entries()).map(([goalId, items]) => (
          <div key={goalId}>
            <Link
              href={`/goals/${goalId}`}
              className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600 hover:underline"
            >
              <CheckCircle2 size={12} />
              {goalTitleById[goalId] || "Goal"}
            </Link>
            <div className="space-y-2">
              {items.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} onUpdate={handleUpdate} />
              ))}
            </div>
          </div>
        ))}

        {groups.standalone.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Not linked to a goal
            </p>
            <div className="space-y-2">
              {groups.standalone.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} onUpdate={handleUpdate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
