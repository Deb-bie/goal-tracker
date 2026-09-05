"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { goalsApi, todosApi, ApiError } from "@/lib/api";
import type { Milestone, MilestoneStatus, Todo } from "@/lib/types";
import TodoItem from "./TodoItem";

const STATUS_OPTIONS: MilestoneStatus[] = ["pending", "in_progress", "completed"];

const STATUS_STYLES: Record<MilestoneStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  in_progress: "bg-brand-50 text-brand-700",
  completed: "bg-emerald-50 text-emerald-700",
};

export default function MilestoneCard({
  goalId,
  milestone,
  onChanged,
}: {
  goalId: string;
  milestone: Milestone;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description || "");
  const [dueDate, setDueDate] = useState(milestone.due_date || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");

  function startEdit() {
    setTitle(milestone.title);
    setDescription(milestone.description || "");
    setDueDate(milestone.due_date || "");
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await goalsApi.updateMilestone(goalId, milestone.id, {
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update milestone.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: MilestoneStatus) {
    await goalsApi.updateMilestone(goalId, milestone.id, { status });
    onChanged();
  }

  async function handleDeleteMilestone() {
    if (!confirm(`Delete milestone "${milestone.title}" and its todos?`)) return;
    await goalsApi.deleteMilestone(goalId, milestone.id);
    onChanged();
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    await todosApi.create({ title: newTodoTitle, goal_id: goalId, milestone_id: milestone.id, due_date: milestone.due_date || undefined });
    setNewTodoTitle("");
    onChanged();
  }

  async function handleToggle(todo: Todo) {
    await todosApi.toggleComplete(todo);
    onChanged();
  }

  async function handleDeleteTodo(todo: Todo) {
    await todosApi.remove(todo.id);
    onChanged();
  }

  async function handleUpdateTodo(todo: Todo, data: Partial<Todo>) {
    await todosApi.update(todo.id, data);
    onChanged();
  }

  if (editing) {
    return (
      <div className="card animate-scale-in">
        <form onSubmit={handleSave} className="space-y-3">
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <input type="date" className="input w-auto" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-sm">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn-secondary !py-1.5 text-sm" onClick={() => setEditing(false)}>
              <X size={14} />
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card card-hover">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-slate-800">{milestone.title}</h3>
          {milestone.description && <p className="text-sm text-slate-500">{milestone.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {milestone.due_date && (
            <span className="badge whitespace-nowrap bg-slate-100 text-slate-500">Due {milestone.due_date}</span>
          )}
          <select
            value={milestone.status}
            onChange={(e) => handleStatusChange(e.target.value as MilestoneStatus)}
            className={`badge cursor-pointer border-0 ${STATUS_STYLES[milestone.status]}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            onClick={startEdit}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600"
            aria-label="Edit milestone"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDeleteMilestone}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
            aria-label="Delete milestone"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {milestone.todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={handleToggle}
            onDelete={handleDeleteTodo}
            onUpdate={handleUpdateTodo}
          />
        ))}
        {milestone.todos.length === 0 && <p className="text-sm text-slate-300">No todos yet.</p>}
      </div>

      <form onSubmit={handleAddTodo} className="mt-3 flex gap-2">
        <input
          className="input"
          placeholder="Add a todo under this milestone…"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
        />
        <button type="submit" className="btn-secondary shrink-0 !py-1.5 text-sm">
          <Plus size={14} />
          Add
        </button>
      </form>
    </div>
  );
}
