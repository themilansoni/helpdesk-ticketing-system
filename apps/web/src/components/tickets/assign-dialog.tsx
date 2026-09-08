import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { useTechnicians } from "@/hooks/use-reference-data";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Ticket } from "@/types";

export function AssignDialog({ ticket, open, onOpenChange }: { ticket: Ticket; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { data: technicians } = useTechnicians();
  const [technicianId, setTechnicianId] = useState(ticket.assignedTechnician?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assign = useMutation({
    mutationFn: () => ticketsDb.assignTicket(ticket.id, technicianId, user!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", ticket.id] });
      toast({ title: "Ticket assigned" });
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to assign ticket.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
        </DialogHeader>
        <Select value={technicianId} onValueChange={setTechnicianId}>
          <SelectTrigger aria-label="Technician"><SelectValue placeholder="Select a technician" /></SelectTrigger>
          <SelectContent>
            {technicians?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.firstName} {t.lastName} · {t.role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!technicianId || assign.isPending} onClick={() => assign.mutate()}>
            {assign.isPending ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
