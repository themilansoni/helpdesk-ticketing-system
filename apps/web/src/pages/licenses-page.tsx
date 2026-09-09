import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogIn, PlusCircle, Trash2, Undo2 } from "lucide-react";
import { licensesDb, usersDb } from "@/lib/db";
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
import { useLicenses } from "@/hooks/use-reference-data";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { License } from "@/types";

const DAY_MS = 86400000;

function expiryBadge(expirationDate: string | null) {
  if (!expirationDate) return null;
  const daysLeft = Math.floor((new Date(expirationDate).getTime() - Date.now()) / DAY_MS);
  if (daysLeft < 0) return <Badge variant="destructive">Expired</Badge>;
  if (daysLeft <= 30) return <Badge variant="warning">Expires in {daysLeft}d</Badge>;
  return null;
}

export default function LicensesPage() {
  const { can, user } = useAuth();
  const canManage = can("ASSET_MANAGE");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<License | null>(null);
  const [seatsItem, setSeatsItem] = useState<License | null>(null);
  const [deleteItem, setDeleteItem] = useState<License | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: licenses, isLoading } = useLicenses();
  const { data: allUsers } = useQuery({
    queryKey: ["users", "all-for-assign"],
    queryFn: () => usersDb.listUsers({ page: 1, pageSize: 200 }),
    enabled: canManage,
  });

  const { data: checkouts } = useQuery({
    queryKey: ["license-checkouts", seatsItem?.id],
    queryFn: () => licensesDb.listLicenseCheckouts(seatsItem!.id),
    enabled: !!seatsItem,
  });

  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("");
  const [expirationDate, setExpirationDate] = useState("");

  const [checkoutUserId, setCheckoutUserId] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["licenses"] });

  const createMutation = useMutation({
    mutationFn: () =>
      licensesDb.createLicense(
        { name, manufacturer: manufacturer || undefined, licenseKey: licenseKey || undefined, seatsTotal: Number(seatsTotal), expirationDate: expirationDate || undefined },
        user!.id
      ),
    onSuccess: () => {
      invalidate();
      toast({ title: "License added" });
      setCreateOpen(false);
      setName("");
      setManufacturer("");
      setLicenseKey("");
      setSeatsTotal("");
      setExpirationDate("");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to add license.")),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => licensesDb.checkoutLicense(checkoutItem!.id, checkoutUserId, user!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Seat assigned" });
      setCheckoutItem(null);
      setCheckoutUserId("");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to assign seat.")),
  });

  const checkinMutation = useMutation({
    mutationFn: (checkoutId: string) => licensesDb.checkinLicense(checkoutId, user!.id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["license-checkouts", seatsItem?.id] });
      toast({ title: "Seat released" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => licensesDb.deleteLicense(id, user!.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "License removed" });
      setDeleteItem(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Software Licenses"
        description="Track seat counts, expirations, and who a license is checked out to."
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-4 w-4" /> Add License
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !licenses || licenses.length === 0 ? (
          <EmptyState icon={KeyRound} title="No licenses yet" description="Track software seats and expiration dates." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Expiration</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-sm">{l.manufacturer ?? "-"}</TableCell>
                  <TableCell className="text-sm">{l.seatsUsed} / {l.seatsTotal}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="mr-2">{formatDate(l.expirationDate)}</span>
                    {expiryBadge(l.expirationDate)}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSeatsItem(l)}>
                          <Undo2 className="h-4 w-4" /> Seats
                        </Button>
                        <Button size="sm" variant="ghost" disabled={l.seatsUsed >= l.seatsTotal} onClick={() => setCheckoutItem(l)}>
                          Assign
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteItem(l)}>
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
          <DialogHeader><DialogTitle>Add License</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adobe Creative Cloud" />
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Seats</Label>
              <Input type="number" min="1" value={seatsTotal} onChange={(e) => setSeatsTotal(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>License key (optional)</Label>
              <Input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Expiration date</Label>
              <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!name || !seatsTotal || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutItem} onOpenChange={(v) => !v && setCheckoutItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign seat · {checkoutItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={checkoutUserId} onValueChange={setCheckoutUserId}>
              <SelectTrigger aria-label="Assign to"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {allUsers?.data.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutItem(null)}>Cancel</Button>
            <Button disabled={!checkoutUserId || checkoutMutation.isPending} onClick={() => checkoutMutation.mutate()}>
              {checkoutMutation.isPending ? "Saving..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!seatsItem} onOpenChange={(v) => !v && setSeatsItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Seats · {seatsItem?.name}</DialogTitle></DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {!checkouts || checkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No seats assigned yet.</p>
            ) : (
              checkouts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                  <div>
                    <p className="font-medium">{c.user.firstName} {c.user.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(c.checkedOutAt)}
                      {c.checkedInAt ? ` → released ${formatDateTime(c.checkedInAt)}` : ""}
                    </p>
                  </div>
                  {!c.checkedInAt && (
                    <Button size="sm" variant="ghost" disabled={checkinMutation.isPending} onClick={() => checkinMutation.mutate(c.id)}>
                      <LogIn className="h-3.5 w-3.5" /> Release
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
