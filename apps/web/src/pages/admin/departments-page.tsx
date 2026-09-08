import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, PlusCircle, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import type { Department } from "@/types";

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<Department[]>("/departments"),
  });

  const create = useMutation({
    mutationFn: () => api.post("/departments", { name, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Department created" });
      setCreateOpen(false);
      setName("");
      setDescription("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Unable to create department."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Department deleted" });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast({ title: "Unable to delete", description: err instanceof ApiError ? err.message : undefined });
      setDeleteTarget(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Manage the organization's departments."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" /> New Department
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? null : !departments || departments.length === 0 ? (
          <EmptyState icon={Building2} title="No departments yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.description ?? "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(d)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Department</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!name || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This cannot be undone. Departments with assigned users cannot be deleted."
        variant="destructive"
        confirmLabel="Delete"
        isLoading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
