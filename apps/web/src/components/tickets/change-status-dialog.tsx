import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useStatuses } from "@/hooks/use-reference-data";
import { STATUS_TRANSITIONS, PENDING_REASONS, PENDING_REASON_LABELS, type TicketStatusName } from "@helpdesk/shared";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Ticket } from "@/types";

export function ChangeStatusDialog({ ticket, open, onOpenChange }: { ticket: Ticket; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: statuses } = useStatuses();
  const allowedNames = STATUS_TRANSITIONS[ticket.status.name as TicketStatusName] ?? [];
  const options = statuses?.filter((s) => allowedNames.includes(s.name as TicketStatusName)) ?? [];

  const [statusId, setStatusId] = useState("");
  const [pendingReason, setPendingReason] = useState("waiting_for_user");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selected = statuses?.find((s) => s.id === statusId);

  const changeStatus = useMutation({
    mutationFn: () =>
      api.post(`/tickets/${ticket.id}/status`, {
        statusId,
        pendingReason: selected?.name === "Pending" ? pendingReason : undefined,
        comment: comment || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticket.id] });
      toast({ title: "Status updated" });
      onOpenChange(false);
      setComment("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Unable to update status."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>New status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected?.name === "Pending" && (
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={pendingReason} onValueChange={setPendingReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PENDING_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{PENDING_REASON_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Comment (optional, visible to requester)</Label>
            <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!statusId || changeStatus.isPending} onClick={() => changeStatus.mutate()}>
            {changeStatus.isPending ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
