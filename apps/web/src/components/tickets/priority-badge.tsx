import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-slate-100 text-slate-700 border-slate-200",
  Medium: "bg-blue-100 text-blue-700 border-blue-200",
  High: "bg-amber-100 text-amber-800 border-amber-200",
  Critical: "bg-red-100 text-red-700 border-red-200",
};

export function PriorityBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        PRIORITY_STYLES[name] ?? "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {name === "Critical" && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
      {name}
    </span>
  );
}
