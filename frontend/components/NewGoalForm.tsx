"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Plus, Sparkles, Wand2 } from "lucide-react";
import { goalsApi, ApiError } from "@/lib/api";
import { TIMEFRAME_LABELS, Timeframe } from "@/lib/types";
import type { Goal, GoalDetail } from "@/lib/types";
import Modal from "./Modal";

type Stage = "form" | "ai" | "done";

export default function NewGoalForm({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("form");

  // Step 1: goal fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("1_month");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 2: AI breakdown
  const [createdGoal, setCreatedGoal] = useState<Goal | null>(null);
  const [granularity, setGranularity] = useState("weekly");
  const [extraContext, setExtraContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [plan, setPlan] = useState<GoalDetail | null>(null);

  function reset() {
    setStage("form");
    setTitle("");
    setDescription("");
    setCategory("");
    setTimeframe("1_month");
    setError(null);
    setCreatedGoal(null);
    setGranularity("weekly");
    setExtraContext("");
    setAiError(null);
    setPlan(null);
  }

  function close() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const goal = await goalsApi.create({
        title,
        description: description || undefined,
        category: category || undefined,
        timeframe,
      });
      onCreated();
      setCreatedGoal(goal);
      setStage("ai");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create goal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function runBreakdown() {
    if (!createdGoal) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const detail = await goalsApi.breakdown(createdGoal.id, {
        granularity,
        extra_context: extraContext || undefined,
      });
      setPlan(detail);
      setStage("done");
      onCreated();
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : "AI breakdown failed.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="btn-primary"
      >
        <Plus size={16} strokeWidth={2.5} />
        New goal
      </button>

      <Modal
        open={open}
        onClose={close}
        title={stage === "form" ? "New goal" : stage === "ai" ? "Plan it with AI" : "You're set"}
      >
        {stage === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div>
              <label className="label">What do you want to achieve?</label>
              <input
                className="input"
                required
                autoFocus
                placeholder="e.g. Run a half marathon"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Any details, constraints, or motivation"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Health, Career"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
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
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Creating…" : "Create goal"}
                {!submitting && <ArrowRight size={15} />}
              </button>
              <button type="button" className="btn-secondary" onClick={close}>
                Cancel
              </button>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-slate-400">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-accent-500" />
              Next, you&apos;ll be able to have the AI break this straight into milestones and todos.
            </p>
          </form>
        )}

        {stage === "ai" && createdGoal && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="shrink-0" />
              &quot;{createdGoal.title}&quot; was created.
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-gradient-soft p-4">
              <h3 className="mb-2 flex items-center gap-2 font-display font-semibold text-brand-800">
                <span className="icon-badge h-8 w-8 rounded-lg">
                  <Sparkles size={15} strokeWidth={2.25} />
                </span>
                AI planning assistant
              </h3>
              <p className="mb-3 text-sm text-slate-600">
                The AI will split this goal into milestones and todos that fit your{" "}
                <strong>{TIMEFRAME_LABELS[createdGoal.timeframe]}</strong> timeframe, starting from{" "}
                {createdGoal.start_date}.
              </p>

              {aiError && (
                <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{aiError}</p>
              )}

              <div className="space-y-3">
                <div>
                  <label className="label">Granularity</label>
                  <select
                    className="input"
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value)}
                  >
                    <option value="daily">Daily steps</option>
                    <option value="weekly">Weekly milestones</option>
                    <option value="monthly">Monthly milestones</option>
                  </select>
                </div>
                <div>
                  <label className="label">Anything else the AI should know? (optional)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="e.g. I can only work on this 3 evenings a week"
                    value={extraContext}
                    onChange={(e) => setExtraContext(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary" disabled={aiLoading} onClick={runBreakdown}>
                    <Wand2 size={14} />
                    {aiLoading ? "Thinking…" : "Generate plan"}
                  </button>
                  <button type="button" className="btn-secondary" onClick={close}>
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {stage === "done" && createdGoal && plan && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="shrink-0" />
              Plan generated: {plan.milestones.length} milestone
              {plan.milestones.length === 1 ? "" : "s"} and {plan.todos.length} todo
              {plan.todos.length === 1 ? "" : "s"}.
            </div>
            <p className="text-sm text-slate-500">
              You can review, tweak, or add to this plan any time from the goal&apos;s page.
            </p>
            <div className="flex gap-2">
              <button
                className="btn-primary"
                onClick={() => {
                  close();
                  router.push(`/goals/${createdGoal.id}`);
                }}
              >
                View goal
                <ArrowRight size={15} />
              </button>
              <button type="button" className="btn-secondary" onClick={close}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
