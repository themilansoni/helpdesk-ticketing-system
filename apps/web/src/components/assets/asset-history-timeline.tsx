import { useQuery } from "@tanstack/react-query";
import { assetsDb } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  created: "added the asset to inventory",
  checked_out: "checked out the asset",
  checked_in: "checked in the asset",
};

export function AssetHistoryTimeline({ assetId }: { assetId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["asset-history", assetId],
    queryFn: () => assetsDb.listAssetHistory(assetId),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading history...</p>;
  if (!history || history.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;

  return (
    <ol className="max-h-80 space-y-4 overflow-y-auto border-l border-border pl-4">
      {history.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm">
            <span className="font-semibold">{h.user ? `${h.user.firstName} ${h.user.lastName}` : "System"}</span>{" "}
            {ACTION_LABELS[h.action] ?? h.action}
            {h.assignedTo && (
              <span className="text-muted-foreground">
                {" "}
                {h.action === "checked_out" ? "to" : "from"}{" "}
                <span className="font-medium text-foreground">
                  {h.assignedTo.firstName} {h.assignedTo.lastName}
                </span>
              </span>
            )}
          </p>
          {h.note && <p className="text-xs text-muted-foreground">"{h.note}"</p>}
          <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
