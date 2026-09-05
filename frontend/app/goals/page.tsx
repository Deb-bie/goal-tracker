"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import GoalCard from "@/components/GoalCard";
import NewGoalForm from "@/components/NewGoalForm";
import { goalsApi } from "@/lib/api";
import type { GoalListItem, GoalStatus } from "@/lib/types";

function GoalsPageContent() {
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [filter, setFilter] = useState<GoalStatus | "all">("active");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await goalsApi.list(filter === "all" ? undefined : filter);
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Your goals</h1>
        <NewGoalForm onCreated={load} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["active", "completed", "archived", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? "pill-active" : "pill-inactive"}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : goals.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <span className="icon-badge mb-3 h-12 w-12 rounded-2xl">
            <Target size={22} strokeWidth={2.25} />
          </span>
          <p className="font-display font-semibold text-slate-800">No goals here yet</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Create one to get started — you can have the AI break it down into a step-by-step plan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsPageContent />
    </ProtectedRoute>
  );
}
