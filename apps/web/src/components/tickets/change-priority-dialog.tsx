import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { usePriorities } from "@/hooks/use-reference-data";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Ticket } from "@/types";

export function ChangePriorityDialog({ ticket, open, onOpenChange }: { ticket: Ticket; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { data: priorities } = usePriorities();
  const [priorityId, setPriorityId] = useState(ticket.priority.id);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const changePriority = useMutation({
    mutationFn: () => ticketsDb.changeTicketPriority(ticket.id, priorityId, user!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", ticket.id] });
      toast({ title: "Priority updated" });
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to update priority.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Priority</DialogTitle>
        </DialogHeader>
        <Select value={priorityId} onValueChange={setPriorityId}>
          <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            {priorities?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={changePriority.isPending} onClick={() => changePriority.mutate()}>
            {changePriority.isPending ? "Updating..." : "Update Priority"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
