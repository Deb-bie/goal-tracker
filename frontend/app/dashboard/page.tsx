"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Flame, Percent, Trophy } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import StatCard from "@/components/StatCard";
import TodayFocus from "@/components/TodayFocus";
import CompletionTrendChart from "@/components/charts/CompletionTrendChart";
import GoalProgressList from "@/components/charts/GoalProgressList";
import { analyticsApi } from "@/lib/api";
import type { Period, PeriodSummary } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

const periods: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "quarterly", label: "This quarter" },
];

function feedbackMessage(summary: PeriodSummary): string {
  const { completion_rate, trend_pct_points, todos_due, current_streak_days } = summary;

  if (todos_due === 0) {
    return "No todos were due in this period. Add some to your goals to start tracking progress here.";
  }
  if (completion_rate >= 90) {
    return `Excellent work — you completed ${completion_rate}% of what was due. Keep this pace up!`;
  }
  if (completion_rate >= 60) {
    return `Solid progress at ${completion_rate}% completion. ${
      trend_pct_points && trend_pct_points > 0 ? "You're trending upward — nice." : "A little more focus could push this higher."
    }`;
  }
  if (completion_rate >= 30) {
    return `You completed ${completion_rate}% of what was due. Consider replanning a goal if the workload feels unrealistic.`;
  }
  if (current_streak_days === 0) {
    return `Only ${completion_rate}% completed and no active streak. A small, easy win today can restart momentum.`;
  }
  return `Only ${completion_rate}% completed this period. Consider using "Replan" on a goal that feels off track.`;
}

function DashboardContent() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("daily");
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi
      .summary(period)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="animate-fade-up">
      <div className="mb-6 overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ""} 👋
        </h1>
        <p className="mt-1 text-brand-50/90">Here&apos;s how you&apos;re tracking toward your goals.</p>
      </div>

      <div className="mb-6">
        <TodayFocus />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={period === p.value ? "pill-active" : "pill-inactive"}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading || !summary ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="card mb-6 border-brand-100 bg-brand-gradient-soft">
            <p className="text-sm text-slate-700">{feedbackMessage(summary)}</p>
            <p className="mt-1 text-xs text-slate-400">
              {summary.range_start} – {summary.range_end}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Completion rate"
              value={`${summary.completion_rate}%`}
              trend={summary.trend_pct_points}
              icon={Percent}
            />
            <StatCard
              label="Todos completed"
              value={`${summary.todos_completed}/${summary.todos_due}`}
              sublabel={
                summary.todos_completed_late_or_extra > 0
                  ? `+${summary.todos_completed_late_or_extra} extra`
                  : undefined
              }
              icon={CheckCircle2}
            />
            <StatCard label="Current streak" value={`${summary.current_streak_days}d`} icon={Flame} />
            <StatCard label="Longest streak" value={`${summary.longest_streak_days}d`} icon={Trophy} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h2 className="mb-3 font-display font-semibold text-slate-800">Due vs. completed</h2>
              <CompletionTrendChart data={summary.daily_breakdown} />
            </div>
            <div className="card">
              <h2 className="mb-3 font-display font-semibold text-slate-800">Goal progress</h2>
              <GoalProgressList goals={summary.goal_progress} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
