import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  sublabel,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: number | null;
  icon?: LucideIcon;
}) {
  return (
    <div className="card card-hover">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon size={15} strokeWidth={2.25} />
          </span>
        )}
      </div>
      <p className="font-display text-2xl font-bold text-slate-900">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {sublabel && <span className="text-slate-400">{sublabel}</span>}
        {trend !== undefined && trend !== null && (
          <span
            className={clsx(
              "font-medium",
              trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-slate-400"
            )}
          >
            {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend).toFixed(1)} pts vs previous
          </span>
        )}
      </div>
    </div>
  );
}
