import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Ticket } from "@/types";

export function EscalateDialog({ ticket, open, onOpenChange }: { ticket: Ticket; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const escalate = useMutation({
    mutationFn: () => api.post(`/tickets/${ticket.id}/escalate`, { note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", ticket.id] });
      toast({ title: "Ticket escalated", description: "Administrators have been notified." });
      onOpenChange(false);
      setNote("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Unable to escalate ticket."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate Ticket</DialogTitle>
          <DialogDescription>
            Escalating raises the priority one level (if not already Critical) and notifies administrators.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Escalation note (optional)</Label>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why does this need escalation?" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={escalate.isPending} onClick={() => escalate.mutate()}>
            {escalate.isPending ? "Escalating..." : "Escalate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
