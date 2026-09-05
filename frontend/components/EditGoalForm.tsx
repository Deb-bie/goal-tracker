"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { goalsApi, ApiError } from "@/lib/api";
import { TIMEFRAME_LABELS, Timeframe } from "@/lib/types";
import type { GoalDetail, GoalStatus } from "@/lib/types";
import Modal from "./Modal";

const STATUS_OPTIONS: GoalStatus[] = ["active", "completed", "archived"];

export default function EditGoalForm({
  goal,
  onUpdated,
}: {
  goal: GoalDetail;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || "");
  const [category, setCategory] = useState(goal.category || "");
  const [timeframe, setTimeframe] = useState<Timeframe>(goal.timeframe);
  const [targetDate, setTargetDate] = useState(goal.target_date || "");
  const [status, setStatus] = useState<GoalStatus>(goal.status);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openForm() {
    // Re-sync in case the goal changed since this form last opened.
    setTitle(goal.title);
    setDescription(goal.description || "");
    setCategory(goal.category || "");
    setTimeframe(goal.timeframe);
    setTargetDate(goal.target_date || "");
    setStatus(goal.status);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await goalsApi.update(goal.id, {
        title,
        description: description || undefined,
        category: category || undefined,
        timeframe,
        target_date: targetDate || undefined,
        status,
      } as any);
      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update goal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="btn-secondary shrink-0 !py-1.5 text-sm" onClick={openForm}>
        <Pencil size={14} />
        Edit
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit goal">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <label className="label">Timeframe</label>
              <select
                className="input"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              >
                {Object.entries(TIMEFRAME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target date</label>
              <input
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
