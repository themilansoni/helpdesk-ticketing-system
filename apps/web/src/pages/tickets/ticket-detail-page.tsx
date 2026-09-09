import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, RefreshCcw, Gauge, TrendingUp, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { ticketsDb } from "@/lib/db";
import { DbError } from "@/lib/db/helpers";
import { useAuth } from "@/lib/auth";
import { PENDING_REASON_LABELS } from "@helpdesk/shared";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { SlaCountdown } from "@/components/tickets/sla-indicator";
import { CommentThread, AttachmentLink } from "@/components/tickets/comment-thread";
import { HistoryTimeline } from "@/components/tickets/history-timeline";
import { AssignDialog } from "@/components/tickets/assign-dialog";
import { ChangeStatusDialog } from "@/components/tickets/change-status-dialog";
import { ChangePriorityDialog } from "@/components/tickets/change-priority-dialog";
import { EscalateDialog } from "@/components/tickets/escalate-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { formatDateTime } from "@/lib/utils";

function SidebarRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialog, setDialog] = useState<"assign" | "status" | "priority" | "escalate" | "close" | "reopen" | null>(null);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketsDb.getTicketById(id!),
    enabled: !!id,
  });

  const canViewTicket = !ticket || user?.role.name !== "Employee" || ticket.requester.id === user.id;

  const resolveTicket = useMutation({
    mutationFn: () => ticketsDb.changeTicketStatus(id!, "Resolved", user!, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", id] });
      toast({ title: "Ticket resolved" });
    },
  });

  const closeTicket = useMutation({
    mutationFn: () => ticketsDb.changeTicketStatus(id!, "Closed", user!, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", id] });
      toast({ title: "Ticket closed" });
      setDialog(null);
    },
  });

  const reopenTicket = useMutation({
    mutationFn: () => ticketsDb.changeTicketStatus(id!, "Reopened", user!, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", id] });
      toast({ title: "Ticket reopened" });
      setDialog(null);
    },
  });

  if ((error instanceof DbError && error.status === 403) || !canViewTicket) {
    return <Navigate to="/forbidden" replace />;
  }

  if (isLoading || !ticket) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const canAssign = can("TICKET_ASSIGN");
  const canChangeStatus = can("TICKET_CHANGE_STATUS");
  const canChangePriority = can("TICKET_CHANGE_PRIORITY");
  const canEscalate = can("TICKET_ESCALATE");
  const isClosed = ticket.status === "Closed";

  return (
    <div>
      <Link to="/tickets" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to tickets
      </Link>

      <PageHeader
        title={`${ticket.ticketNumber} - ${ticket.subject}`}
        description={`Requested by ${ticket.requester.firstName} ${ticket.requester.lastName} on ${formatDateTime(ticket.createdAt)}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge name={ticket.status} />
        <PriorityBadge name={ticket.priority.name} />
        {ticket.pendingReason && (
          <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs">
            {PENDING_REASON_LABELS[ticket.pendingReason as keyof typeof PENDING_REASON_LABELS] ?? ticket.pendingReason}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          Assigned to {ticket.assignedTechnician ? `${ticket.assignedTechnician.firstName} ${ticket.assignedTechnician.lastName}` : "no one"}
        </span>
        {ticket.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
            #{tag}
          </span>
        ))}
      </div>

      {(canAssign || canChangeStatus || canChangePriority || canEscalate) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {canAssign && (
            <Button size="sm" variant="outline" onClick={() => setDialog("assign")}>
              <UserPlus className="h-3.5 w-3.5" /> Assign
            </Button>
          )}
          {canChangeStatus && !isClosed && (
            <Button size="sm" variant="outline" onClick={() => setDialog("status")}>
              <RefreshCcw className="h-3.5 w-3.5" /> Change Status
            </Button>
          )}
          {canChangePriority && (
            <Button size="sm" variant="outline" onClick={() => setDialog("priority")}>
              <Gauge className="h-3.5 w-3.5" /> Change Priority
            </Button>
          )}
          {canEscalate && !isClosed && (
            <Button size="sm" variant="outline" onClick={() => setDialog("escalate")}>
              <TrendingUp className="h-3.5 w-3.5" /> Escalate
            </Button>
          )}
          {canChangeStatus && ticket.status !== "Resolved" && !isClosed && (
            <Button size="sm" onClick={() => resolveTicket.mutate()} disabled={resolveTicket.isPending}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
            </Button>
          )}
          {canChangeStatus && !isClosed && (
            <Button size="sm" variant="secondary" onClick={() => setDialog("close")}>
              <XCircle className="h-3.5 w-3.5" /> Close
            </Button>
          )}
          {canChangeStatus && isClosed && (
            <Button size="sm" variant="secondary" onClick={() => setDialog("reopen")}>
              <RotateCcw className="h-3.5 w-3.5" /> Reopen
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground">{ticket.description}</p>
              {ticket.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ticket.attachments.map((a) => (
                    <AttachmentLink key={a.storagePath} attachment={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="conversation">
            <TabsList>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="conversation">
              <CommentThread ticketId={ticket.id} />
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardContent className="p-4">
                  <HistoryTimeline ticketId={ticket.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SlaCountdown sla={ticket.sla} isClosed={isClosed} />
              <p className="text-xs text-muted-foreground">
                Resolution deadline: {formatDateTime(ticket.slaResolutionDeadline)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <SidebarRow label="Requester" value={`${ticket.requester.firstName} ${ticket.requester.lastName}`} />
              <SidebarRow label="Department" value={ticket.department?.name ?? "-"} />
              <SidebarRow label="Location" value={ticket.location?.name ?? "-"} />
              <Separator className="my-2" />
              <SidebarRow label="Category" value={ticket.category.name} />
              <SidebarRow label="Subcategory" value={ticket.subcategory?.name ?? "-"} />
              <SidebarRow label="Priority" value={<PriorityBadge name={ticket.priority.name} />} />
              <SidebarRow label="Asset" value={ticket.asset?.assetTag ?? "-"} />
              <Separator className="my-2" />
              <SidebarRow label="Technician" value={ticket.assignedTechnician ? `${ticket.assignedTechnician.firstName} ${ticket.assignedTechnician.lastName}` : "Unassigned"} />
              <SidebarRow label="Created" value={formatDateTime(ticket.createdAt)} />
              <SidebarRow label="Updated" value={formatDateTime(ticket.updatedAt)} />
              <SidebarRow label="Resolved" value={formatDateTime(ticket.resolvedAt)} />
              <SidebarRow label="Closed" value={formatDateTime(ticket.closedAt)} />
              {ticket.reopenedCount > 0 && <SidebarRow label="Reopened" value={`${ticket.reopenedCount} time(s)`} />}
            </CardContent>
          </Card>
        </div>
      </div>

      <AssignDialog ticket={ticket} open={dialog === "assign"} onOpenChange={(v) => setDialog(v ? "assign" : null)} />
      <ChangeStatusDialog ticket={ticket} open={dialog === "status"} onOpenChange={(v) => setDialog(v ? "status" : null)} />
      <ChangePriorityDialog ticket={ticket} open={dialog === "priority"} onOpenChange={(v) => setDialog(v ? "priority" : null)} />
      <EscalateDialog ticket={ticket} open={dialog === "escalate"} onOpenChange={(v) => setDialog(v ? "escalate" : null)} />
      <ConfirmDialog
        open={dialog === "close"}
        onOpenChange={(v) => setDialog(v ? "close" : null)}
        title="Close this ticket?"
        description="The requester will be notified. Closed tickets can be reopened later if needed."
        confirmLabel="Close Ticket"
        isLoading={closeTicket.isPending}
        onConfirm={() => closeTicket.mutate()}
      />
      <ConfirmDialog
        open={dialog === "reopen"}
        onOpenChange={(v) => setDialog(v ? "reopen" : null)}
        title="Reopen this ticket?"
        description="This will move the ticket back into an active state for further work."
        confirmLabel="Reopen Ticket"
        isLoading={reopenTicket.isPending}
        onConfirm={() => reopenTicket.mutate()}
      />
    </div>
  );
}
