import { formatDuration, type SlaHealth } from "@helpdesk/shared";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlaInfo } from "@/types";

const HEALTH_META: Record<SlaHealth, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: "On Track", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  at_risk: { label: "At Risk", className: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  breached: { label: "Breached", className: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
};

export function SlaBadge({ sla, className }: { sla: SlaInfo; className?: string }) {
  const meta = HEALTH_META[sla.overallHealth];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        meta.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export function SlaCountdown({ sla, isClosed }: { sla: SlaInfo; isClosed: boolean }) {
  const meta = HEALTH_META[sla.resolutionHealth];
  const Icon = meta.icon;
  const remainingLabel = isClosed
    ? "Resolution complete"
    : sla.resolutionMsRemaining >= 0
      ? `${formatDuration(sla.resolutionMsRemaining)} remaining`
      : `${formatDuration(sla.resolutionMsRemaining)} overdue`;

  return (
    <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2", meta.className)}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-tight">{meta.label}</p>
        <p className="truncate text-xs opacity-90">{remainingLabel}</p>
      </div>
    </div>
  );
}
