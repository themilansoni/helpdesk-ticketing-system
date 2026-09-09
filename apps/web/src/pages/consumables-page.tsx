import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, PlusCircle, Trash2 } from "lucide-react";
import { consumablesDb, usersDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useLocations, useConsumables } from "@/hooks/use-reference-data";
import type { Consumable } from "@/types";

export default function ConsumablesPage() {
  const { can, user } = useAuth();
  const canManage = can("ASSET_MANAGE");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<Consumable | null>(null);
  const [deleteItem, setDeleteItem] = useState<Consumable | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: consumables, isLoading } = useConsumables();
  const { data: locations } = useLocations();
  const { data: allUsers } = useQuery({
    queryKey: ["users", "all-for-assign"],
    queryFn: () => usersDb.listUsers({ page: 1, pageSize: 200 }),
    enabled: canManage,
  });

  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [quantityTotal, setQuantityTotal] = useState("");
  const [minQuantity, setMinQuantity] = useState("0");
  const [locationId, setLocationId] = useState("");

  const [checkoutUserId, setCheckoutUserId] = useState("");
  const [checkoutQty, setCheckoutQty] = useState("1");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["consumables"] });

  const createMutation = useMutation({
    mutationFn: () =>
      consumablesDb.createConsumable(
        {
          name,
          manufacturer: manufacturer || undefined,
          modelNumber: modelNumber || undefined,
          quantityTotal: Number(quantityTotal),
          minQuantity: Number(minQuantity) || 0,
          locationId: locationId || undefined,
        },
        user!.id
      ),
    onSuccess: () => {
      invalidate();
      toast({ title: "Consumable added" });
      setCreateOpen(false);
      setName("");
      setManufacturer("");
      setModelNumber("");
      setQuantityTotal("");
      setMinQuantity("0");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to add consumable.")),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => consumablesDb.checkoutConsumable(checkoutItem!.id, checkoutUserId, Number(checkoutQty), user!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Consumable issued" });
      setCheckoutItem(null);
      setCheckoutUserId("");
      setCheckoutQty("1");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to issue consumable.")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => consumablesDb.deleteConsumable(id, user!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Consumable removed" });
      setDeleteItem(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Consumables"
        description="Quantity-tracked supplies like toner, cables, and peripherals."
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-4 w-4" /> Add Consumable
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !consumables || consumables.length === 0 ? (
          <EmptyState icon={Package} title="No consumables yet" description="Add toner, cables, or other supplies to track stock." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Stock</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumables.map((c) => {
                const low = c.quantityRemaining <= c.minQuantity;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.manufacturer ?? "-"}</TableCell>
                    <TableCell className="text-sm">{c.location?.name ?? "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm">{c.quantityRemaining} / {c.quantityTotal}</span>
                      {low && <Badge variant="warning" className="ml-2">Low stock</Badge>}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" disabled={c.quantityRemaining === 0} onClick={() => setCheckoutItem(c)}>
                            Issue
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteItem(c)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Consumable</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HP 26A Toner" />
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Model / Part #</Label>
              <Input value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity in stock</Label>
              <Input type="number" min="0" value={quantityTotal} onChange={(e) => setQuantityTotal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Low-stock alert below</Label>
              <Input type="number" min="0" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger aria-label="Location"><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!name || !quantityTotal || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutItem} onOpenChange={(v) => !v && setCheckoutItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue {checkoutItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={checkoutUserId} onValueChange={setCheckoutUserId}>
                <SelectTrigger aria-label="Issue to"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {allUsers?.data.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity ({checkoutItem?.quantityRemaining} available)</Label>
              <Input type="number" min="1" max={checkoutItem?.quantityRemaining} value={checkoutQty} onChange={(e) => setCheckoutQty(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutItem(null)}>Cancel</Button>
            <Button disabled={!checkoutUserId || !checkoutQty || checkoutMutation.isPending} onClick={() => checkoutMutation.mutate()}>
              {checkoutMutation.isPending ? "Saving..." : "Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(v) => !v && setDeleteItem(null)}
        title={`Delete "${deleteItem?.name}"?`}
        variant="destructive"
        confirmLabel="Delete"
        isLoading={removeMutation.isPending}
        onConfirm={() => deleteItem && removeMutation.mutate(deleteItem.id)}
      />
    </div>
  );
}
