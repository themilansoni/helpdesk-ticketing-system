import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, PlusCircle, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAssetTypes, useDepartments, useLocations, useTechnicians } from "@/hooks/use-reference-data";
import { debounce, formatDate } from "@/lib/utils";
import type { Asset, PaginatedResult } from "@/types";

const ALL = "__all__";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  const { data: assetTypes } = useAssetTypes();
  const { data: departments } = useDepartments();
  const { data: locations } = useLocations();
  const { data: technicians } = useTechnicians();

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value);
        setPage(1);
      }, 300),
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ["assets", search, status, page],
    queryFn: () =>
      api.get<PaginatedResult<Asset>>("/assets", {
        search: search || undefined,
        status: status === ALL ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [assetTypeId, setAssetTypeId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAsset = useMutation({
    mutationFn: () =>
      api.post("/assets", {
        assetTag,
        serialNumber: serialNumber || undefined,
        assetTypeId,
        manufacturer: manufacturer || undefined,
        model: model || undefined,
        departmentId: departmentId || undefined,
        locationId: locationId || undefined,
        status: "available",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({ title: "Asset created" });
      setCreateOpen(false);
      setAssetTag("");
      setSerialNumber("");
      setAssetTypeId("");
      setManufacturer("");
      setModel("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Unable to create asset."),
  });

  const assignMutation = useMutation({
    mutationFn: () => api.post(`/assets/${assignAsset?.id}/assign`, { userId: assignUserId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({ title: "Asset assignment updated" });
      setAssignAsset(null);
    },
  });

  return (
    <div>
      <PageHeader
        title={user?.role.name === "Employee" ? "My Assets" : "Assets"}
        description="Track IT hardware and equipment across the organization."
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-4 w-4" /> Add Asset
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by tag, serial, model..." className="pl-8" onChange={(e) => debouncedSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
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
                  {canManage && <TableHead />}
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
                    {canManage && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAssignAsset(a);
                            setAssignUserId(a.assignedUser?.id ?? "");
                          }}
                        >
                          Assign
                        </Button>
                      </TableCell>
                    )}
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
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {assetTypes?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
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
            <Button disabled={!assetTag || !assetTypeId || createAsset.isPending} onClick={() => createAsset.mutate()}>
              {createAsset.isPending ? "Saving..." : "Save Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignAsset} onOpenChange={(v) => !v && setAssignAsset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign {assignAsset?.assetTag}</DialogTitle></DialogHeader>
          <Select value={assignUserId || ALL} onValueChange={(v) => setAssignUserId(v === ALL ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Unassign</SelectItem>
              {technicians?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignAsset(null)}>Cancel</Button>
            <Button disabled={assignMutation.isPending} onClick={() => assignMutation.mutate()}>
              {assignMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
