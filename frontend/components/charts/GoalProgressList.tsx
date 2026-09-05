import type { GoalProgress } from "@/lib/types";

export default function GoalProgressList({ goals }: { goals: GoalProgress[] }) {
  if (goals.length === 0) {
    return <p className="text-sm text-slate-400">No active goals yet.</p>;
  }
  return (
    <div className="space-y-3">
      {goals.map((g) => (
        <div key={g.goal_id}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-700">{g.title}</span>
            <span className="text-slate-400">
              {g.todos_completed}/{g.todos_total} · {g.progress_pct}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${g.progress_pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
