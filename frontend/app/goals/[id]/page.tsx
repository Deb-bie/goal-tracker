"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, Flag, Milestone as MilestoneIcon, Plus, Trash2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AIBreakdownPanel from "@/components/AIBreakdownPanel";
import EditGoalForm from "@/components/EditGoalForm";
import MilestoneCard from "@/components/MilestoneCard";
import TodoItem from "@/components/TodoItem";
import { goalsApi, todosApi, ApiError } from "@/lib/api";
import type { GoalDetail, Todo } from "@/lib/types";
import { TIMEFRAME_LABELS } from "@/lib/types";

function GoalDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");

  async function load() {
    try {
      const data = await goalsApi.get(id);
      setGoal(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load goal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleToggle(todo: Todo) {
    await todosApi.toggleComplete(todo);
    load();
  }

  async function handleDelete(todo: Todo) {
    await todosApi.remove(todo.id);
    load();
  }

  async function handleUpdateTodo(todo: Todo, data: Partial<Todo>) {
    await todosApi.update(todo.id, data);
    load();
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodoTitle.trim() || !goal) return;
    await todosApi.create({ title: newTodoTitle, goal_id: goal.id });
    setNewTodoTitle("");
    load();
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !goal) return;
    await goalsApi.createMilestone(goal.id, {
      title: newMilestoneTitle,
      due_date: newMilestoneDue || undefined,
    });
    setNewMilestoneTitle("");
    setNewMilestoneDue("");
    setAddingMilestone(false);
    load();
  }

  async function handleDeleteGoal() {
    if (!goal) return;
    if (!confirm(`Delete "${goal.title}" and all its milestones/todos?`)) return;
    await goalsApi.remove(goal.id);
    router.push("/goals");
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error || !goal) return <p className="text-red-600">{error || "Goal not found."}</p>;

  const unassignedTodos = goal.todos.filter((t) => !t.milestone_id);

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-slate-900">{goal.title}</h1>
          {goal.description && <p className="mt-1 text-slate-500">{goal.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
            <span>{TIMEFRAME_LABELS[goal.timeframe]}</span>
            <span className="flex items-center gap-1">
              <CalendarDays size={13} /> Started {goal.start_date}
            </span>
            {goal.target_date && (
              <span className="flex items-center gap-1">
                <Flag size={13} /> Target {goal.target_date}
              </span>
            )}
            {goal.category && <span className="font-medium text-accent-600">#{goal.category}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <EditGoalForm goal={goal} onUpdated={load} />
          <button className="btn-danger !py-1.5 text-sm" onClick={handleDeleteGoal}>
            <Trash2 size={14} />
            Delete goal
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-medium text-slate-700">Overall progress</span>
          <span className="font-semibold text-brand-700">{goal.progress_pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${goal.progress_pct}%` }} />
        </div>
      </div>

      <AIBreakdownPanel goal={goal} onUpdated={load} />

      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display font-semibold text-slate-800">
            <MilestoneIcon size={17} className="text-brand-600" />
            Milestones
          </h2>
          {!addingMilestone && (
            <button className="btn-secondary !py-1.5 text-xs" onClick={() => setAddingMilestone(true)}>
              <Plus size={13} />
              Add milestone
            </button>
          )}
        </div>

        {addingMilestone && (
          <form onSubmit={handleAddMilestone} className="card animate-scale-in flex flex-wrap gap-2">
            <input
              className="input flex-1"
              autoFocus
              required
              placeholder="Milestone title…"
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
            />
            <input
              type="date"
              className="input w-auto"
              value={newMilestoneDue}
              onChange={(e) => setNewMilestoneDue(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0 !py-1.5 text-sm">
              Add
            </button>
            <button
              type="button"
              className="btn-secondary shrink-0 !py-1.5 text-sm"
              onClick={() => setAddingMilestone(false)}
            >
              Cancel
            </button>
          </form>
        )}

        {goal.milestones.map((m) => (
          <MilestoneCard key={m.id} goalId={goal.id} milestone={m} onChanged={load} />
        ))}

        {goal.milestones.length === 0 && !addingMilestone && (
          <p className="text-sm text-slate-400">
            No milestones yet — use &quot;Break down with AI&quot; above, or add one manually.
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-display font-semibold text-slate-800">
          {goal.milestones.length > 0 ? "Other todos" : "Todos"}
        </h2>
        <form onSubmit={handleAddTodo} className="mb-3 flex gap-2">
          <input
            className="input"
            placeholder="Add a todo for this goal…"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
          />
          <button type="submit" className="btn-secondary shrink-0">
            <Plus size={15} />
            Add
          </button>
        </form>
        <div className="space-y-2">
          {unassignedTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdate={handleUpdateTodo}
            />
          ))}
          {unassignedTodos.length === 0 && <p className="text-sm text-slate-300">Nothing here yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default function GoalDetailPage() {
  return (
    <ProtectedRoute>
      <GoalDetailContent />
    </ProtectedRoute>
  );
}
