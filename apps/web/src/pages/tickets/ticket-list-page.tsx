import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Search, PlusCircle, Inbox } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { SlaBadge } from "@/components/tickets/sla-indicator";
import { useCategories, usePriorities, useStatuses, useDepartments } from "@/hooks/use-reference-data";
import { formatDate, debounce } from "@/lib/utils";
import type { PaginatedResult, Ticket } from "@/types";

const PAGE_SIZE = 15;
const ALL = "__all__";

export default function TicketListPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get("search") ?? "");
  const [page, setPage] = useState(1);

  const { data: categories } = useCategories();
  const { data: priorities } = usePriorities();
  const { data: statuses } = useStatuses();
  const { data: departments } = useDepartments();

  const filters = {
    search: params.get("search") ?? undefined,
    statusId: params.get("statusId") ?? undefined,
    priorityId: params.get("priorityId") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    departmentId: params.get("departmentId") ?? undefined,
    assignee: params.get("assignee") ?? undefined,
    unassigned: params.get("unassigned") ?? undefined,
    sla: params.get("sla") ?? undefined,
    sort: params.get("sort") ?? "newest",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filters, page],
    queryFn: () =>
      api.get<PaginatedResult<Ticket>>("/tickets", {
        ...filters,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const updateParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        updateParam("search", value || undefined);
      }, 350),
    [params]
  );

  const isEmployee = user?.role.name === "Employee";
  const title = isEmployee ? "My Tickets" : filters.unassigned ? "Unassigned Tickets" : filters.sla === "breached" ? "SLA Breaches" : filters.assignee === "me" ? "My Tickets" : "All Tickets";

  return (
    <div>
      <PageHeader
        title={title}
        description="Search, filter, and track support tickets."
        actions={
          <Button asChild>
            <Link to="/tickets/new">
              <PlusCircle className="h-4 w-4" />
              Create Ticket
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, subject, requester..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch(e.target.value);
            }}
          />
        </div>

        <Select value={filters.statusId ?? ALL} onValueChange={(v) => updateParam("statusId", v)}>
          <SelectTrigger className="w-40" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {statuses?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priorityId ?? ALL} onValueChange={(v) => updateParam("priorityId", v)}>
          <SelectTrigger className="w-40" aria-label="Priority"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {priorities?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.categoryId ?? ALL} onValueChange={(v) => updateParam("categoryId", v)}>
          <SelectTrigger className="w-44" aria-label="Category"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isEmployee && (
          <Select value={filters.departmentId ?? ALL} onValueChange={(v) => updateParam("departmentId", v)}>
            <SelectTrigger className="w-44" aria-label="Department"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All departments</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filters.sort} onValueChange={(v) => updateParam("sort", v)}>
          <SelectTrigger className="w-40" aria-label="Sort"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="sla">SLA deadline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No tickets found"
            description="Try adjusting your filters, or create a new ticket."
            action={
              <Button asChild size="sm">
                <Link to="/tickets/new">Create Ticket</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <Link to={`/tickets/${t.id}`} className="text-primary hover:underline">
                        {t.ticketNumber}
                      </Link>
                      <p className="max-w-[240px] truncate text-xs text-muted-foreground">{t.subject}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.requester.firstName} {t.requester.lastName}
                    </TableCell>
                    <TableCell className="text-sm">{t.category.name}</TableCell>
                    <TableCell><PriorityBadge name={t.priority.name} /></TableCell>
                    <TableCell className="text-sm">
                      {t.assignedTechnician ? `${t.assignedTechnician.firstName} ${t.assignedTechnician.lastName}` : "Unassigned"}
                    </TableCell>
                    <TableCell><StatusBadge name={t.status.name} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                    <TableCell><SlaBadge sla={t.sla} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
