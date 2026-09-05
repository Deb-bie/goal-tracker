"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { goalsApi, ApiError } from "@/lib/api";
import type { GoalDetail } from "@/lib/types";

export default function AIBreakdownPanel({
  goal,
  onUpdated,
}: {
  goal: GoalDetail;
  onUpdated: () => void;
}) {
  const [granularity, setGranularity] = useState("weekly");
  const [extraContext, setExtraContext] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "breakdown" | "replan">("idle");

  async function runBreakdown() {
    setLoading(true);
    setError(null);
    try {
      await goalsApi.breakdown(goal.id, { granularity, extra_context: extraContext || undefined });
      setMode("idle");
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI breakdown failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runReplan() {
    setLoading(true);
    setError(null);
    try {
      await goalsApi.replan(goal.id, { reason: reason || undefined });
      setMode("idle");
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI replan failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb-6 border-brand-100 bg-brand-gradient-soft">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold text-brand-800">
          <span className="icon-badge h-8 w-8 rounded-lg">
            <Sparkles size={15} strokeWidth={2.25} />
          </span>
          AI planning assistant
        </h2>
        {mode === "idle" && (
          <div className="flex gap-2">
            {!goal.ai_generated_plan && (
              <button className="btn-primary !py-1.5 text-sm" onClick={() => setMode("breakdown")}>
                <Wand2 size={14} />
                Break down with AI
              </button>
            )}
            {goal.ai_generated_plan && (
              <button className="btn-secondary !py-1.5 text-sm" onClick={() => setMode("replan")}>
                Falling behind? Replan
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {mode === "breakdown" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            The AI will split this goal into milestones and todos that fit your{" "}
            <strong>{goal.timeframe.replace("_", " ")}</strong> timeframe, starting from {goal.start_date}.
          </p>
          <div>
            <label className="label">Granularity</label>
            <select className="input" value={granularity} onChange={(e) => setGranularity(e.target.value)}>
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
            <button className="btn-primary" disabled={loading} onClick={runBreakdown}>
              {loading ? "Thinking…" : "Generate plan"}
            </button>
            <button className="btn-secondary" onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "replan" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Completed milestones and todos stay as-is. Everything still pending will be replaced with a
            fresh plan for the time you have left.
          </p>
          <div>
            <label className="label">What changed? (optional, helps the AI adjust)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. I missed the last two weeks because of travel"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={loading} onClick={runReplan}>
              {loading ? "Replanning…" : "Replan remaining work"}
            </button>
            <button className="btn-secondary" onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "idle" && !goal.ai_generated_plan && (
        <p className="text-sm text-slate-500">
          This goal doesn&apos;t have an AI-generated plan yet. Click &quot;Break down with AI&quot; to turn
          it into concrete milestones and todos.
        </p>
      )}
    </div>
  );
}
