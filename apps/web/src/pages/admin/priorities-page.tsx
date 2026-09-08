import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { referenceDb } from "@/lib/db";
import { getErrorMessage } from "@/lib/firebase-errors";
import { usePriorities } from "@/hooks/use-reference-data";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import type { Priority } from "@/types";

function formatMinutes(minutes: number): string {
  if (minutes % (60 * 24) === 0) return `${minutes / (60 * 24)} day(s)`;
  if (minutes % 60 === 0) return `${minutes / 60} hour(s)`;
  return `${minutes} min`;
}

function SlaEditor({ priority }: { priority: Priority }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [firstResponse, setFirstResponse] = useState(String(priority.slaPolicy?.firstResponseMinutes ?? ""));
  const [resolution, setResolution] = useState(String(priority.slaPolicy?.resolutionMinutes ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      referenceDb.updateSlaPolicy(priority.id, {
        firstResponseMinutes: Number(firstResponse),
        resolutionMinutes: Number(resolution),
        businessHoursOnly: priority.slaPolicy?.businessHoursOnly ?? false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priorities"] });
      toast({ title: `${priority.name} SLA updated` });
      setEditing(false);
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to update SLA policy.")),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm text-foreground">
          <PriorityBadge name={priority.name} />
        </CardTitle>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>First response (minutes)</Label>
              <Input type="number" min={1} value={firstResponse} onChange={(e) => setFirstResponse(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Resolution (minutes)</Label>
              <Input type="number" min={1} value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">First response</dt>
              <dd className="font-medium">{priority.slaPolicy ? formatMinutes(priority.slaPolicy.firstResponseMinutes) : "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Resolution</dt>
              <dd className="font-medium">{priority.slaPolicy ? formatMinutes(priority.slaPolicy.resolutionMinutes) : "-"}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrioritiesPage() {
  const { data: priorities, isLoading } = usePriorities();

  return (
    <div>
      <PageHeader title="Priorities & SLA Policies" description="Configure response and resolution targets per priority level." />
      {isLoading ? null : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {priorities?.map((p) => <SlaEditor key={p.id} priority={p} />)}
        </div>
      )}
    </div>
  );
}
