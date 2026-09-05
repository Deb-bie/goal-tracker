import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import type { GoalListItem } from "@/lib/types";
import { TIMEFRAME_LABELS } from "@/lib/types";

const statusStyles: Record<string, string> = {
  active: "bg-brand-50 text-brand-700",
  completed: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function GoalCard({ goal }: { goal: GoalListItem }) {
  return (
    <Link href={`/goals/${goal.id}`} className="card card-hover group block">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display font-semibold text-slate-900">{goal.title}</h3>
          {goal.category && <p className="text-xs font-medium text-accent-600">#{goal.category}</p>}
        </div>
        <span className={clsx("badge shrink-0", statusStyles[goal.status])}>
          {goal.status === "completed" && <CheckCircle2 size={12} />}
          {goal.status}
        </span>
      </div>
      {goal.description && <p className="mb-3 line-clamp-2 text-sm text-slate-500">{goal.description}</p>}
      <div className="mb-2 flex items-center gap-3 text-xs text-slate-400">
        <span>{TIMEFRAME_LABELS[goal.timeframe]}</span>
        {goal.target_date && (
          <span className="flex items-center gap-1">
            <CalendarDays size={12} /> {goal.target_date}
          </span>
        )}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${goal.progress_pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-600">{goal.progress_pct}% complete</span>
        <span className="flex items-center gap-1">
          {goal.todos_completed}/{goal.todos_total} todos
          <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
