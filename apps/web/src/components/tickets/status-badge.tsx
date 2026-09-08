import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  New: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Open: "bg-sky-100 text-sky-700 border-sky-200",
  "In Progress": "bg-violet-100 text-violet-700 border-violet-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Closed: "bg-gray-100 text-gray-600 border-gray-200",
  Reopened: "bg-orange-100 text-orange-700 border-orange-200",
};

export function StatusBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[name] ?? "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {name}
    </span>
  );
}
