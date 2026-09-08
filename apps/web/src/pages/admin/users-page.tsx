import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { KeyRound, PlusCircle, Search, Users as UsersIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { ROLES, type RoleName } from "@helpdesk/shared";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useDepartments } from "@/hooks/use-reference-data";
import { debounce } from "@/lib/utils";
import type { CurrentUser, PaginatedResult } from "@/types";

const ALL = "__all__";
const PAGE_SIZE = 15;

export default function UsersPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: departments } = useDepartments();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(params.get("role") ?? ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<CurrentUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useMemo(() => debounce((v: string) => { setSearch(v); setPage(1); }, 300), []);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, role, status, page],
    queryFn: () =>
      api.get<PaginatedResult<CurrentUser>>("/users", {
        search: search || undefined,
        role: role === ALL ? undefined : role,
        status: status === ALL ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "disabled" }) =>
      api.post(`/users/${id}/${status === "active" ? "enable" : "disable"}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User status updated" });
    },
  });

  const resetPassword = useMutation({
    mutationFn: () => api.post(`/users/${resetTarget?.id}/reset-password`, { password: newPassword }),
    onSuccess: () => {
      toast({ title: "Password reset" });
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Unable to reset password."),
  });

  // --- Create user form state ---
  const [employeeId, setEmployeeId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState<RoleName>("Employee");
  const [departmentId, setDepartmentId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const createUser = useMutation({
    mutationFn: () =>
      api.post("/users", {
        employeeId,
        firstName,
        lastName,
        email,
        password,
        roleName,
        departmentId: departmentId || undefined,
        jobTitle: jobTitle || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User created" });
      setCreateOpen(false);
      setEmployeeId("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setJobTitle("");
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : "Unable to create user."),
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage employee accounts, roles, and access."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" /> New User
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-8" onChange={(e) => debouncedSearch(e.target.value)} />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar firstName={u.firstName} lastName={u.lastName} />
                        <div>
                          <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{u.role.name}</Badge></TableCell>
                    <TableCell className="text-sm">{u.department?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "success" : "destructive"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setResetTarget(u)}>
                            <KeyRound className="mr-2 h-3.5 w-3.5" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleStatus.mutate({ id: u.id, status: u.status === "active" ? "disabled" : "active" })}
                          >
                            {u.status === "active" ? "Disable User" : "Enable User"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Employee ID</Label>
              <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Temporary Password</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleName} onValueChange={(v) => setRoleName(v as RoleName)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!employeeId || !firstName || !lastName || !email || password.length < 8 || createUser.isPending}
              onClick={() => createUser.mutate()}
            >
              {createUser.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password for {resetTarget?.firstName} {resetTarget?.lastName}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button disabled={newPassword.length < 8 || resetPassword.isPending} onClick={() => resetPassword.mutate()}>
              {resetPassword.isPending ? "Saving..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
