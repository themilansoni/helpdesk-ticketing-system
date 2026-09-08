import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Tags, Trash2 } from "lucide-react";
import { referenceDb } from "@/lib/db";
import { getErrorMessage } from "@/lib/firebase-errors";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import type { TicketCategory, TicketSubcategory } from "@/types";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [subFor, setSubFor] = useState<TicketCategory | null>(null);
  const [subName, setSubName] = useState("");
  const [deleteCategory, setDeleteCategory] = useState<TicketCategory | null>(null);
  const [deleteSub, setDeleteSub] = useState<TicketSubcategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => referenceDb.listCategories(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const createCategory = useMutation({
    mutationFn: () => referenceDb.createCategory(name),
    onSuccess: () => {
      invalidate();
      toast({ title: "Category created" });
      setCreateOpen(false);
      setName("");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to create category.")),
  });

  const createSubcategory = useMutation({
    mutationFn: () => referenceDb.createSubcategory(subName, subFor!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Subcategory created" });
      setSubFor(null);
      setSubName("");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to create subcategory.")),
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => referenceDb.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Category deleted" });
      setDeleteCategory(null);
    },
    onError: (err) => {
      toast({ title: "Unable to delete", description: getErrorMessage(err) });
      setDeleteCategory(null);
    },
  });

  const removeSubcategory = useMutation({
    mutationFn: (id: string) => referenceDb.deleteSubcategory(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Subcategory deleted" });
      setDeleteSub(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage ticket categories and subcategories."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" /> New Category
          </Button>
        }
      />

      {isLoading ? null : !categories || categories.length === 0 ? (
        <EmptyState icon={Tags} title="No categories yet" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {categories.map((c) => (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-foreground">{c.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setSubFor(c)}>
                    <PlusCircle className="h-3.5 w-3.5" /> Subcategory
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteCategory(c)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {c.subcategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No subcategories</p>
                ) : (
                  c.subcategories.map((s) => (
                    <Badge key={s.id} variant="secondary" className="cursor-pointer gap-1" onClick={() => setDeleteSub(s)}>
                      {s.name}
                      <Trash2 className="h-2.5 w-2.5" />
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!name || createCategory.isPending} onClick={() => createCategory.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!subFor} onOpenChange={(v) => !v && setSubFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Subcategory in {subFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={subName} onChange={(e) => setSubName(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubFor(null)}>Cancel</Button>
            <Button disabled={!subName || createSubcategory.isPending} onClick={() => createSubcategory.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCategory}
        onOpenChange={(v) => !v && setDeleteCategory(null)}
        title={`Delete "${deleteCategory?.name}"?`}
        description="Categories used by existing tickets cannot be deleted."
        variant="destructive"
        confirmLabel="Delete"
        isLoading={removeCategory.isPending}
        onConfirm={() => deleteCategory && removeCategory.mutate(deleteCategory.id)}
      />
      <ConfirmDialog
        open={!!deleteSub}
        onOpenChange={(v) => !v && setDeleteSub(null)}
        title={`Delete "${deleteSub?.name}"?`}
        variant="destructive"
        confirmLabel="Delete"
        isLoading={removeSubcategory.isPending}
        onConfirm={() => deleteSub && removeSubcategory.mutate(deleteSub.id)}
      />
    </div>
  );
}
