import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  FileUp,
  KeyRound,
  Loader2,
  Pencil,
  PlusCircle,
  Search,
  Upload,
  Users as UsersIcon,
  XCircle,
} from "lucide-react";
import { usersDb } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/firebase-errors";
import { parseCsv, csvRowsToObjects, toCsv } from "@/lib/csv";
import { ROLES, type RoleName } from "@helpdesk/shared";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
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
import type { CurrentUser } from "@/types";

interface ImportRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: RoleName | null;
  departmentId: string | null;
  departmentNameRaw: string;
  jobTitle: string;
  errors: string[];
}

type ImportRowResult = { status: "pending" | "success" | "error"; message?: string };

function generateTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "Tmp-" + Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16) + "!1";
}

const ALL = "__all__";
const PAGE_SIZE = 15;

export default function UsersPage() {
  const [params] = useSearchParams();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: departments } = useDepartments();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(params.get("role") ?? ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<CurrentUser | null>(null);
  const [editTarget, setEditTarget] = useState<CurrentUser | null>(null);

  const debouncedSearch = useMemo(() => debounce((v: string) => { setSearch(v); setPage(1); }, 300), []);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, role, status, page],
    queryFn: () =>
      usersDb.listUsers({
        search: search || undefined,
        role: role === ALL ? undefined : role,
        status: status === ALL ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "disabled" }) => usersDb.setUserStatus(id, status, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User status updated" });
    },
  });

  const resetPassword = useMutation({
    mutationFn: () => usersDb.sendUserPasswordReset(resetTarget!.email, currentUser!.id, resetTarget!.id),
    onSuccess: () => {
      toast({ title: "Password reset email sent", description: `An email was sent to ${resetTarget?.email}.` });
      setResetTarget(null);
    },
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
      usersDb.createUser(
        {
          employeeId,
          firstName,
          lastName,
          email,
          password,
          roleName,
          departmentId: departmentId || undefined,
          jobTitle: jobTitle || undefined,
        },
        currentUser!.id
      ),
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
    onError: (err) => setCreateError(getErrorMessage(err, "Unable to create user.")),
  });

  // --- Edit user form state ---
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editRoleName, setEditRoleName] = useState<RoleName>("Employee");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(u: CurrentUser) {
    setEditTarget(u);
    setEditFirstName(u.firstName);
    setEditLastName(u.lastName);
    setEditJobTitle(u.jobTitle ?? "");
    setEditRoleName(u.role.name);
    setEditDepartmentId(u.department?.id ?? "");
    setEditError(null);
  }

  const editUser = useMutation({
    mutationFn: () =>
      usersDb.updateUser(
        editTarget!.id,
        {
          firstName: editFirstName,
          lastName: editLastName,
          jobTitle: editJobTitle || undefined,
          roleName: editRoleName,
          departmentId: editDepartmentId || undefined,
        },
        currentUser!.id
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User updated" });
      setEditTarget(null);
    },
    onError: (err) => setEditError(getErrorMessage(err, "Unable to update user.")),
  });

  // --- Bulk import (CSV) state ---
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importResults, setImportResults] = useState<Record<number, ImportRowResult>>({});
  const [importRunning, setImportRunning] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  function resetImport() {
    setImportFileName("");
    setImportRows([]);
    setImportResults({});
    setImportRunning(false);
  }

  async function handleImportFile(file: File) {
    setImportFileName(file.name);
    setImportResults({});
    const text = await file.text();
    const objects = csvRowsToObjects(parseCsv(text));
    const parsed: ImportRow[] = objects.map((r) => {
      const errors: string[] = [];
      const employeeId = r["employeeid"] ?? r["employee id"] ?? "";
      const firstName = r["firstname"] ?? r["first name"] ?? "";
      const lastName = r["lastname"] ?? r["last name"] ?? "";
      const email = r["email"] ?? "";
      const roleRaw = (r["role"] ?? "").trim();
      const departmentNameRaw = r["department"] ?? "";
      const jobTitle = r["jobtitle"] ?? r["job title"] ?? "";

      if (!employeeId) errors.push("Missing employee ID");
      if (!firstName) errors.push("Missing first name");
      if (!lastName) errors.push("Missing last name");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email");

      const roleMatch = ROLES.find((r2) => r2.toLowerCase() === roleRaw.toLowerCase());
      if (!roleMatch) errors.push(roleRaw ? `Unknown role "${roleRaw}"` : "Missing role");

      let departmentId: string | null = null;
      if (departmentNameRaw) {
        const dept = departments?.find((d) => d.name.toLowerCase() === departmentNameRaw.toLowerCase());
        if (dept) departmentId = dept.id;
        else errors.push(`Unknown department "${departmentNameRaw}"`);
      }

      return { employeeId, firstName, lastName, email, roleName: roleMatch ?? null, departmentId, departmentNameRaw, jobTitle, errors };
    });
    setImportRows(parsed);
  }

  const validImportCount = importRows.filter((r) => r.errors.length === 0).length;

  async function runImport() {
    setImportRunning(true);
    const results: Record<number, ImportRowResult> = {};
    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      if (row.errors.length > 0) {
        results[i] = { status: "error", message: row.errors.join(", ") };
        setImportResults({ ...results });
        continue;
      }
      try {
        const uid = await usersDb.createUser(
          {
            employeeId: row.employeeId,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            password: generateTempPassword(),
            roleName: row.roleName!,
            departmentId: row.departmentId ?? undefined,
            jobTitle: row.jobTitle || undefined,
          },
          currentUser!.id
        );
        await usersDb.sendUserPasswordReset(row.email, currentUser!.id, uid).catch(() => {});
        results[i] = { status: "success" };
      } catch (err) {
        results[i] = { status: "error", message: getErrorMessage(err, "Failed to create user.") };
      }
      setImportResults({ ...results });
    }
    setImportRunning(false);
    queryClient.invalidateQueries({ queryKey: ["users"] });
    const successCount = Object.values(results).filter((r) => r.status === "success").length;
    toast({
      title: `Imported ${successCount} of ${importRows.length} users`,
      description: successCount > 0 ? "Each new user was emailed a link to set their password." : undefined,
    });
  }

  function downloadImportTemplate() {
    const csv = toCsv(
      ["employeeId", "firstName", "lastName", "email", "role", "department", "jobTitle"],
      [["EMP-1234", "Jane", "Doe", "jane.doe@company.com", "Employee", departments?.[0]?.name ?? "IT", "Support Analyst"]]
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage employee accounts, roles, and access."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { resetImport(); setImportOpen(true); }}>
              <FileUp className="h-4 w-4" /> Bulk Import
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusCircle className="h-4 w-4" /> New User
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-8" onChange={(e) => debouncedSearch(e.target.value)} />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Role"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
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
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetTarget(u)}>
                            <KeyRound className="mr-2 h-3.5 w-3.5" /> Send Password Reset
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
                <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
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
                <SelectTrigger aria-label="Department"><SelectValue placeholder="Select department" /></SelectTrigger>
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

      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit {editTarget?.firstName} {editTarget?.lastName}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input value={editTarget?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRoleName} onValueChange={(v) => setEditRoleName(v as RoleName)}>
                <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Department</Label>
              <Select value={editDepartmentId} onValueChange={setEditDepartmentId}>
                <SelectTrigger aria-label="Department"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {editError && <p className="text-sm text-destructive">{editError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button disabled={!editFirstName || !editLastName || editUser.isPending} onClick={() => editUser.mutate()}>
              {editUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(v) => { if (!importRunning) { setImportOpen(v); if (!v) resetImport(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bulk Import Users</DialogTitle></DialogHeader>

          {importRows.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload a CSV with columns <code className="rounded bg-secondary px-1 py-0.5 text-xs">employeeId, firstName,
                lastName, email, role, department, jobTitle</code>. Each new user gets a random temporary password and
                an email to set their own.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={downloadImportTemplate}>
                  <Download className="h-4 w-4" /> Download Template
                </Button>
                <Button variant="outline" onClick={() => importFileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Choose CSV File
                </Button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleImportFile(file);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{importFileName}</span> &middot; {importRows.length} rows,{" "}
                  {validImportCount} ready to import
                </span>
                <Button variant="ghost" size="sm" onClick={resetImport} disabled={importRunning}>
                  Choose a different file
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map((row, i) => {
                      const result = importResults[i];
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            {result?.status === "success" ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : result?.status === "error" || row.errors.length > 0 ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : importRunning ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : null}
                          </TableCell>
                          <TableCell className="text-sm">{row.firstName} {row.lastName}</TableCell>
                          <TableCell className="text-sm">{row.email || "-"}</TableCell>
                          <TableCell className="text-sm">{row.roleName ?? "-"}</TableCell>
                          <TableCell className="text-sm">{row.departmentNameRaw || "-"}</TableCell>
                          <TableCell className="text-xs text-destructive">
                            {result?.status === "error" ? result.message : row.errors.join(", ")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importRunning}>
              {Object.keys(importResults).length > 0 ? "Close" : "Cancel"}
            </Button>
            {importRows.length > 0 && (
              <Button onClick={runImport} disabled={validImportCount === 0 || importRunning || Object.keys(importResults).length > 0}>
                {importRunning ? "Importing..." : `Import ${validImportCount} User${validImportCount === 1 ? "" : "s"}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(v) => !v && setResetTarget(null)}
        title={`Send a password reset email to ${resetTarget?.firstName} ${resetTarget?.lastName}?`}
        description={`Firebase will email a reset link directly to ${resetTarget?.email}.`}
        confirmLabel="Send Email"
        isLoading={resetPassword.isPending}
        onConfirm={() => resetPassword.mutate()}
      />
    </div>
  );
}
