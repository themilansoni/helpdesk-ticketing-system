import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { TicketHistoryEntry } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  created: "created the ticket",
  status_changed: "changed the status",
  priority_changed: "changed the priority",
  assigned: "assigned the ticket",
  unassigned: "unassigned the ticket",
  escalated: "escalated the ticket",
  note_added: "added an internal note",
  replied: "replied",
  resolved: "marked the ticket resolved",
  closed: "closed the ticket",
  reopened: "reopened the ticket",
};

export function HistoryTimeline({ ticketId }: { ticketId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["ticket-history", ticketId],
    queryFn: () => api.get<TicketHistoryEntry[]>(`/tickets/${ticketId}/history`),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading history...</p>;
  if (!history || history.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;

  return (
    <ol className="space-y-4 border-l border-border pl-4">
      {history.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm">
            <span className="font-semibold">{h.user ? `${h.user.firstName} ${h.user.lastName}` : "System"}</span>{" "}
            {ACTION_LABELS[h.action] ?? h.action}
            {h.oldValue && h.newValue ? (
              <span className="text-muted-foreground">
                {" "}
                from <span className="font-medium text-foreground">{h.oldValue}</span> to{" "}
                <span className="font-medium text-foreground">{h.newValue}</span>
              </span>
            ) : h.newValue ? (
              <span className="text-muted-foreground">
                : <span className="font-medium text-foreground">{h.newValue}</span>
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
