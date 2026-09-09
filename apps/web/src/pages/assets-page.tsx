import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Laptop, LayoutGrid, LogIn, LogOut, PlusCircle, Search } from "lucide-react";
import { assetsDb, usersDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { AssetHistoryTimeline } from "@/components/assets/asset-history-timeline";
import { CatalogManagerDialog } from "@/components/assets/catalog-manager-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAssetTypes, useDepartments, useLocations, useManufacturers, useAssetModels } from "@/hooks/use-reference-data";
import { debounce, formatDate } from "@/lib/utils";
import type { Asset } from "@/types";

const ALL = "__all__";
const NONE = "__none__";
const PAGE_SIZE = 12;
const STATUS_TONE: Record<string, NonNullable<BadgeProps["variant"]>> = {
  available: "success",
  assigned: "default",
  in_repair: "warning",
  retired: "secondary",
  lost: "destructive",
};

export default function AssetsPage() {
  const { can, user } = useAuth();
  const canManage = can("ASSET_MANAGE");
  const isAdmin = user?.role.name === "Administrator";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [checkoutAsset, setCheckoutAsset] = useState<Asset | null>(null);
  const [checkoutUserId, setCheckoutUserId] = useState("");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [checkinAsset, setCheckinAsset] = useState<Asset | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const { data: assetTypes } = useAssetTypes();
  const { data: departments } = useDepartments();
  const { data: locations } = useLocations();
  const { data: manufacturers } = useManufacturers();
  const { data: assetModels } = useAssetModels();
  const { data: allUsers } = useQuery({
    queryKey: ["users", "all-for-assign"],
    queryFn: () => usersDb.listUsers({ page: 1, pageSize: 200 }),
    enabled: canManage,
  });

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value);
        setPage(1);
      }, 300),
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["assets", search, status, page, user?.role.name, user?.id],
    queryFn: () =>
      assetsDb.listAssets({
        search: search || undefined,
        status: status === ALL ? undefined : status,
        assignedUserId: user?.role.name === "Employee" ? user.id : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: !!user,
  });

  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetTypeId, setAssetTypeId] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [assetModelId, setAssetModelId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const modelOptions = useMemo(
    () => (manufacturerId ? (assetModels ?? []).filter((m) => m.manufacturer?.id === manufacturerId) : assetModels ?? []),
    [assetModels, manufacturerId]
  );

  const createAssetMutation = useMutation({
    mutationFn: () =>
      assetsDb.createAsset(
        {
          assetTag,
          serialNumber: serialNumber || undefined,
          assetTypeId,
          manufacturerId: manufacturerId || undefined,
          assetModelId: assetModelId || undefined,
          departmentId: departmentId || undefined,
          locationId: locationId || undefined,
          status: "available",
        },
        { id: user!.id, firstName: user!.firstName, lastName: user!.lastName }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({ title: "Asset created" });
      setCreateOpen(false);
      setAssetTag("");
      setSerialNumber("");
      setAssetTypeId("");
      setManufacturerId("");
      setAssetModelId("");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to create asset.")),
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      assetsDb.checkoutAsset(
        checkoutAsset!.id,
        checkoutUserId,
        { id: user!.id, firstName: user!.firstName, lastName: user!.lastName },
        checkoutNote || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({ title: "Asset checked out" });
      setCheckoutAsset(null);
      setCheckoutUserId("");
      setCheckoutNote("");
    },
    onError: (err) => setError(getErrorMessage(err, "Unable to check out asset.")),
  });

  const checkinMutation = useMutation({
    mutationFn: () => assetsDb.checkinAsset(checkinAsset!.id, { id: user!.id, firstName: user!.firstName, lastName: user!.lastName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({ title: "Asset checked in" });
      setCheckinAsset(null);
    },
    onError: (err) => {
      toast({ title: "Unable to check in", description: getErrorMessage(err) });
      setCheckinAsset(null);
    },
  });

  return (
    <div>
      <PageHeader
        title={user?.role.name === "Employee" ? "My Assets" : "Assets"}
        description="Track IT hardware, checkouts, and full assignment history."
        actions={
          canManage ? (
            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => setCatalogOpen(true)}>
                  <LayoutGrid className="h-4 w-4" /> Catalog
                </Button>
              )}
              <Button onClick={() => setCreateOpen(true)}>
                <PlusCircle className="h-4 w-4" /> Add Asset
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by tag, serial, model..." className="pl-8" onChange={(e) => debouncedSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_repair">In Repair</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Laptop} title="No assets found" description="Try adjusting your filters." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Tag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.assetTag}</TableCell>
                    <TableCell className="text-sm">{a.assetType.name}</TableCell>
                    <TableCell className="text-sm">{a.model ?? "-"}</TableCell>
                    <TableCell className="text-sm">
                      {a.assignedUser ? `${a.assignedUser.firstName} ${a.assignedUser.lastName}` : "Unassigned"}
                    </TableCell>
                    <TableCell className="text-sm">{a.department?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_TONE[a.status] ?? "outline"}>{a.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.warrantyExpiry)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="History" onClick={() => setHistoryAsset(a)}>
                          <History className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          a.assignedUser ? (
                            <Button size="sm" variant="ghost" onClick={() => setCheckinAsset(a)}>
                              <LogIn className="h-4 w-4" /> Check-in
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setCheckoutAsset(a)}>
                              <LogOut className="h-4 w-4" /> Checkout
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Asset Tag</Label>
              <Input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} placeholder="AST-1010" />
            </div>
            <div className="space-y-1.5">
              <Label>Serial Number</Label>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={assetTypeId} onValueChange={setAssetTypeId}>
                <SelectTrigger aria-label="Asset type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {assetTypes?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Select value={manufacturerId || NONE} onValueChange={(v) => { setManufacturerId(v === NONE ? "" : v); setAssetModelId(""); }}>
                <SelectTrigger aria-label="Manufacturer"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {manufacturers?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Model</Label>
              <Select value={assetModelId || NONE} onValueChange={(v) => setAssetModelId(v === NONE ? "" : v)}>
                <SelectTrigger aria-label="Model"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {modelOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger aria-label="Department"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button disabled={!assetTag || !assetTypeId || createAssetMutation.isPending} onClick={() => createAssetMutation.mutate()}>
              {createAssetMutation.isPending ? "Saving..." : "Save Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutAsset} onOpenChange={(v) => !v && setCheckoutAsset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check out {checkoutAsset?.assetTag}</DialogTitle></DialogHeader>
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
              <Label>Note (optional)</Label>
              <Textarea value={checkoutNote} onChange={(e) => setCheckoutNote(e.target.value)} placeholder="e.g. Condition, accessories included..." />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutAsset(null)}>Cancel</Button>
            <Button disabled={!checkoutUserId || checkoutMutation.isPending} onClick={() => checkoutMutation.mutate()}>
              {checkoutMutation.isPending ? "Saving..." : "Check Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkinAsset} onOpenChange={(v) => !v && setCheckinAsset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Check in {checkinAsset?.assetTag}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will return the asset from {checkinAsset?.assignedUser?.firstName} {checkinAsset?.assignedUser?.lastName} and mark it available.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinAsset(null)}>Cancel</Button>
            <Button disabled={checkinMutation.isPending} onClick={() => checkinMutation.mutate()}>
              {checkinMutation.isPending ? "Saving..." : "Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyAsset} onOpenChange={(v) => !v && setHistoryAsset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>History · {historyAsset?.assetTag}</DialogTitle></DialogHeader>
          {historyAsset && <AssetHistoryTimeline assetId={historyAsset.id} />}
        </DialogContent>
      </Dialog>

      <CatalogManagerDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </div>
  );
}
