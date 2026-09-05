"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Pencil, RefreshCcw, Trash2, X } from "lucide-react";
import type { Priority, Todo } from "@/lib/types";

const priorityDot: Record<string, string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-red-500",
};

export default function TodoItem({
  todo,
  onToggle,
  onDelete,
  onUpdate,
  showGoalBadge,
  goalTitle,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onUpdate?: (todo: Todo, data: Partial<Todo>) => Promise<void> | void;
  showGoalBadge?: boolean;
  goalTitle?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || "");
  const [dueDate, setDueDate] = useState(todo.due_date || "");
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [saving, setSaving] = useState(false);

  const completed = todo.status === "completed";

  function startEdit() {
    setTitle(todo.title);
    setDescription(todo.description || "");
    setDueDate(todo.due_date || "");
    setPriority(todo.priority);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!onUpdate || !title.trim()) return;
    setSaving(true);
    try {
      await onUpdate(todo, {
        title,
        description: description || undefined,
        due_date: dueDate || undefined,
        priority,
      } as Partial<Todo>);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="animate-scale-in space-y-2 rounded-xl border border-brand-200 bg-brand-50/30 p-3">
        <input
          className="input"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Todo title"
        />
        <textarea
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            className="input w-auto flex-1"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <select
            className="input w-auto flex-1"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-xs">
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setEditing(false)}>
            <X size={13} />
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        completed ? "border-slate-100 bg-slate-50/60" : "border-slate-100 bg-white hover:border-slate-200"
      )}
    >
      <button
        onClick={() => onToggle(todo)}
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          completed
            ? "border-brand-600 bg-brand-gradient text-white"
            : "border-slate-300 hover:border-brand-400"
        )}
        aria-label={completed ? "Mark as pending" : "Mark as complete"}
      >
        {completed && <Check size={12} strokeWidth={3} />}
      </button>
      <span className={clsx("h-2 w-2 shrink-0 rounded-full", priorityDot[todo.priority])} title={todo.priority} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={clsx("truncate text-sm", completed ? "text-slate-400 line-through" : "text-slate-800")}>
            {todo.title}
          </p>
          {showGoalBadge && (
            <span
              className={clsx(
                "badge",
                goalTitle ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
              )}
            >
              {goalTitle || "No goal"}
            </span>
          )}
        </div>
        <div className="flex gap-2 text-xs text-slate-400">
          {todo.due_date && <span>Due {todo.due_date}</span>}
          {todo.recurrence !== "none" && (
            <span className="flex items-center gap-0.5">
              <RefreshCcw size={10} /> {todo.recurrence}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
        {onUpdate && (
          <button
            onClick={startEdit}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-brand-50 hover:text-brand-600"
            aria-label="Edit todo"
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          onClick={() => onDelete(todo)}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
          aria-label="Delete todo"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
