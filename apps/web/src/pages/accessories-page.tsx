import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cable, LogIn, PlusCircle, Trash2, Undo2 } from "lucide-react";
import { accessoriesDb, usersDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useLocations, useAccessories } from "@/hooks/use-reference-data";
import { formatDateTime } from "@/lib/utils";
import type { Accessory } from "@/types";

export default function AccessoriesPage() {
  const { can, user } = useAuth();
  const canManage = can("ASSET_MANAGE");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<Accessory | null>(null);
  const [returnsItem, setReturnsItem] = useState<Accessory | null>(null);
  const [deleteItem, setDeleteItem] = useState<Accessory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: accessories, isLoading } = useAccessories();
  const { data: locations } = useLocations();
  const { data: allUsers } = useQuery({
    queryKey: ["users", "all-for-assign"],
    queryFn: () => usersDb.listUsers({ page: 1, pageSize: 200 }),
    enabled: canManage,
  });

  const { data: checkouts } = useQuery({
    queryKey: ["accessory-checkouts", returnsItem?.id],
    queryFn: () => accessoriesDb.listAccessoryCheckouts(returnsItem!.id),
    enabled: !!returnsItem,
  });

  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [quantityTotal, setQuantityTotal] = useState("");
  const [locationId, setLocationId] = useState("");

  const [checkoutUserId, setCheckoutUserId] = useState("");
  const [checkoutQty, setCheckoutQty] = useState("1");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["accessories"] });

  const createMutation = useMutation({
    mutationFn: () =>
      accessoriesDb.createAccessory(
        { name, manufacturer: manufacturer || undefined, modelNumber: modelNumber || undefined, quantityTotal: Number(quantityTotal), locationId: locationId || undefined },
        user!.id
      ),
    onSuccess: () => {
      invalidate();
      toast({ title: "Accessory added" });
      setCreateOpen(false);
      setName("");
      setManufacturer("");
      setModelNumber("");
      setQuantityTotal("");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to add accessory.")),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => accessoriesDb.checkoutAccessory(checkoutItem!.id, checkoutUserId, Number(checkoutQty), user!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Accessory checked out" });
      setCheckoutItem(null);
      setCheckoutUserId("");
      setCheckoutQty("1");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to check out accessory.")),
  });

  const checkinMutation = useMutation({
    mutationFn: (checkoutId: string) => accessoriesDb.checkinAccessory(checkoutId, user!.id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["accessory-checkouts", returnsItem?.id] });
      toast({ title: "Accessory checked in" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => accessoriesDb.deleteAccessory(id, user!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Accessory removed" });
      setDeleteItem(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Accessories"
        description="Checkable, returnable items like keyboards, mice, and docks."
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-4 w-4" /> Add Accessory
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !accessories || accessories.length === 0 ? (
          <EmptyState icon={Cable} title="No accessories yet" description="Add keyboards, mice, docks, or other returnable items." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Available</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessories.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.manufacturer ?? "-"}</TableCell>
                  <TableCell className="text-sm">{a.location?.name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{a.quantityRemaining} / {a.quantityTotal}</TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setReturnsItem(a)}>
                          <Undo2 className="h-4 w-4" /> Returns
                        </Button>
                        <Button size="sm" variant="ghost" disabled={a.quantityRemaining === 0} onClick={() => setCheckoutItem(a)}>
                          Checkout
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteItem(a)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Accessory</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Logitech MX Keys" />
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Model #</Label>
              <Input value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity in stock</Label>
              <Input type="number" min="0" value={quantityTotal} onChange={(e) => setQuantityTotal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
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
          <DialogHeader><DialogTitle>Check out {checkoutItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={checkoutUserId} onValueChange={setCheckoutUserId}>
                <SelectTrigger aria-label="Check out to"><SelectValue placeholder="Select employee" /></SelectTrigger>
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
              {checkoutMutation.isPending ? "Saving..." : "Check Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnsItem} onOpenChange={(v) => !v && setReturnsItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Checkouts · {returnsItem?.name}</DialogTitle></DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {!checkouts || checkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No checkouts yet.</p>
            ) : (
              checkouts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                  <div>
                    <p className="font-medium">{c.user.firstName} {c.user.lastName} · {c.quantity}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(c.checkedOutAt)}
                      {c.checkedInAt ? ` → returned ${formatDateTime(c.checkedInAt)}` : ""}
                    </p>
                  </div>
                  {!c.checkedInAt && (
                    <Button size="sm" variant="ghost" disabled={checkinMutation.isPending} onClick={() => checkinMutation.mutate(c.id)}>
                      <LogIn className="h-3.5 w-3.5" /> Check in
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
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
