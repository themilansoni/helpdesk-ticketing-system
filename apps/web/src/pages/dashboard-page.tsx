import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { Ticket, Clock, AlertOctagon, UserX, CheckCircle2, PlusCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { reportsDb, ticketsDb } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { SlaBadge } from "@/components/tickets/sla-indicator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

const CHART_COLORS = ["#4f46e5", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#6b7280", "#ef4444"];

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Ticket; tone: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, can } = useAuth();
  const canViewReports = can("REPORTS_VIEW");

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["reports", "summary"],
    queryFn: () => reportsDb.getDashboardSummary(),
    enabled: canViewReports,
  });

  const { data: byPriority } = useQuery({
    queryKey: ["reports", "by-priority"],
    queryFn: () => reportsDb.getTicketsByPriority(),
    enabled: canViewReports,
  });

  const { data: byCategory } = useQuery({
    queryKey: ["reports", "by-category"],
    queryFn: () => reportsDb.getTicketsByCategory(),
    enabled: canViewReports,
  });

  const { data: overTime } = useQuery({
    queryKey: ["reports", "over-time"],
    queryFn: () => reportsDb.getTicketsOverTime(21),
    enabled: canViewReports,
  });

  const { data: resolutionTrend } = useQuery({
    queryKey: ["reports", "resolution-trend"],
    queryFn: () => reportsDb.getResolutionTimeTrend(30),
    enabled: canViewReports,
  });

  const { data: byDepartment } = useQuery({
    queryKey: ["reports", "by-department"],
    queryFn: () => reportsDb.getTicketsByDepartment(),
    enabled: canViewReports,
  });

  const { data: workload } = useQuery({
    queryKey: ["reports", "workload"],
    queryFn: () => reportsDb.getTechnicianWorkload(),
    enabled: can("TICKET_ASSIGN"),
  });

  const { data: recentTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["tickets", "recent", user?.role.name, user?.id],
    queryFn: () =>
      ticketsDb.listTickets({
        requestingUserId: user!.id,
        requestingUserRole: user!.role.name,
        page: 1,
        pageSize: 8,
        sort: "newest",
        mine: user?.role.name === "Employee",
      }),
    enabled: !!user,
  });

  const statusData = summary?.byStatus
    ? Object.entries(summary.byStatus)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.firstName}`}
        description={canViewReports ? "Here's what's happening across the helpdesk today." : "Here's a summary of your support tickets."}
        actions={
          <Button asChild>
            <Link to="/tickets/new">
              <PlusCircle className="h-4 w-4" />
              Create Ticket
            </Link>
          </Button>
        }
      />

      {canViewReports ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {summaryLoading ? (
              Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : (
              <>
                <StatCard label="Total Tickets" value={summary?.total ?? 0} icon={Ticket} tone="bg-indigo-100 text-indigo-700" />
                <StatCard label="Open" value={summary?.open ?? 0} icon={Clock} tone="bg-sky-100 text-sky-700" />
                <StatCard label="In Progress" value={summary?.inProgress ?? 0} icon={Clock} tone="bg-violet-100 text-violet-700" />
                <StatCard label="Pending" value={summary?.pending ?? 0} icon={Clock} tone="bg-amber-100 text-amber-800" />
                <StatCard label="Resolved" value={summary?.resolved ?? 0} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-700" />
                <StatCard label="Closed" value={summary?.closed ?? 0} icon={CheckCircle2} tone="bg-gray-100 text-gray-600" />
                <StatCard label="Overdue" value={summary?.overdue ?? 0} icon={AlertOctagon} tone="bg-red-100 text-red-700" />
                <StatCard label="Unassigned" value={summary?.unassigned ?? 0} icon={UserX} tone="bg-orange-100 text-orange-700" />
              </>
            )}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Status</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets by Priority</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPriority ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(byPriority ?? []).map((entry, i) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory ?? []} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tickets Created Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overTime ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => formatDate(v)} minTickGap={30} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <RechartsTooltip labelFormatter={(v) => formatDate(v as string)} />
                    <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tickets by Department</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDepartment ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={9} interval={0} angle={-25} textAnchor="end" height={50} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resolution Time Trend (avg hours)</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resolutionTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => formatDate(v)} minTickGap={30} />
                    <YAxis fontSize={11} />
                    <RechartsTooltip labelFormatter={(v) => formatDate(v as string)} />
                    <Line type="monotone" dataKey="avgHours" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {workload && (
              <Card>
                <CardHeader>
                  <CardTitle>Technician Workload</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workload}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={45} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="open" name="Open" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total" name="Total" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="My Open Tickets"
            value={recentTickets?.data.filter((t) => t.status !== "Closed").length ?? 0}
            icon={Clock}
            tone="bg-sky-100 text-sky-700"
          />
          <StatCard
            label="My Total Tickets"
            value={recentTickets?.total ?? 0}
            icon={Ticket}
            tone="bg-indigo-100 text-indigo-700"
          />
          <StatCard
            label="Breached SLA"
            value={recentTickets?.data.filter((t) => t.sla.overallHealth === "breached").length ?? 0}
            icon={AlertOctagon}
            tone="bg-red-100 text-red-700"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ticketsLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
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
                {recentTickets?.data.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to={`/tickets/${t.id}`} className="text-primary hover:underline">
                        {t.ticketNumber}
                      </Link>
                      <p className="max-w-[220px] truncate text-xs text-muted-foreground">{t.subject}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.requester.firstName} {t.requester.lastName}
                    </TableCell>
                    <TableCell className="text-sm">{t.category.name}</TableCell>
                    <TableCell>
                      <PriorityBadge name={t.priority.name} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.assignedTechnician ? `${t.assignedTechnician.firstName} ${t.assignedTechnician.lastName}` : "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge name={t.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                    <TableCell>
                      <SlaBadge sla={t.sla} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
