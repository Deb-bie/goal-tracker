"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import TodoItem from "@/components/TodoItem";
import { goalsApi, todosApi } from "@/lib/api";
import type { GoalListItem, Todo } from "@/lib/types";

function TodosPageContent() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newGoalId, setNewGoalId] = useState("");
  const [goalFilter, setGoalFilter] = useState<string>("all"); 
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [t, g] = await Promise.all([todosApi.list(), goalsApi.list()]);
      setTodos(t);
      setGoals(g);
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await todosApi.create({ title: newTitle, goal_id: newGoalId || undefined });
    setNewTitle("");
    load();
  }

  const goalTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    goals.forEach((g) => (map[g.id] = g.title));
    return map;
  }, [goals]);

  const visibleTodos = useMemo(() => {
    if (goalFilter === "all") return todos;
    if (goalFilter === "none") return todos.filter((t) => !t.goal_id);
    return todos.filter((t) => t.goal_id === goalFilter);
  }, [todos, goalFilter]);

  const groups = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pending = visibleTodos.filter((t) => t.status === "pending");
    const completed = visibleTodos.filter((t) => t.status === "completed");
    return {
      overdue: pending.filter((t) => t.due_date && t.due_date < today),
      today: pending.filter((t) => t.due_date === today),
      upcoming: pending.filter((t) => t.due_date && t.due_date > today),
      noDate: pending.filter((t) => !t.due_date),
      completed: completed.sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || "")).slice(0, 20),
    };
  }, [visibleTodos]);

  function Section({ title, items }: { title: string; items: Todo[] }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {title} ({items.length})
        </h2>
        <div className="space-y-2">
          {items.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              showGoalBadge
              goalTitle={todo.goal_id ? goalTitleById[todo.goal_id] : undefined}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="mb-6 flex items-center gap-2 font-display text-2xl font-bold text-slate-900">
        <ListTodo className="text-brand-600" size={24} />
        Todos
      </h1>

      <form onSubmit={handleAdd} className="card mb-6 flex flex-wrap gap-2">
        <input
          className="input flex-1"
          placeholder="Quick add a todo…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <select
          className="input w-auto shrink-0"
          value={newGoalId}
          onChange={(e) => setNewGoalId(e.target.value)}
          aria-label="Attach to goal"
        >
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary shrink-0">
          <Plus size={16} strokeWidth={2.5} />
          Add
        </button>
      </form>

      {goals.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setGoalFilter("all")} className={goalFilter === "all" ? "pill-active" : "pill-inactive"}>
            All goals
          </button>
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => setGoalFilter(g.id)}
              className={goalFilter === g.id ? "pill-active" : "pill-inactive"}
            >
              {g.title}
            </button>
          ))}
          <button onClick={() => setGoalFilter("none")} className={goalFilter === "none" ? "pill-active" : "pill-inactive"}>
            No goal
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : visibleTodos.length === 0 ? (
        <div className="card text-center text-slate-400">
          {todos.length === 0 ? "No todos yet." : "No todos match this filter."}
        </div>
      ) : (
        <>
          <Section title="Overdue" items={groups.overdue} />
          <Section title="Today" items={groups.today} />
          <Section title="Upcoming" items={groups.upcoming} />
          <Section title="No due date" items={groups.noDate} />
          <Section title="Recently completed" items={groups.completed} />
        </>
      )}
    </div>
  );
}

export default function TodosPage() {
  return (
    <ProtectedRoute>
      <TodosPageContent />
    </ProtectedRoute>
  );
}
