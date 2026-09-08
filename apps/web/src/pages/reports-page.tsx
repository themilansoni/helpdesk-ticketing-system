import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api, API_BASE_URL, tokenStorage } from "@/lib/api";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent } from "@/lib/format";

async function downloadCsv(type: string) {
  const token = tokenStorage.getAccessToken();
  const res = await fetch(`${API_BASE_URL}/reports/export.csv?type=${type}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-report.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ExportButton({ type }: { type: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => downloadCsv(type)}>
      <Download className="h-3.5 w-3.5" /> Export CSV
    </Button>
  );
}

export default function ReportsPage() {
  const { data: compliance } = useQuery({
    queryKey: ["reports", "sla-compliance"],
    queryFn: () => api.get<{ compliant: number; breached: number; total: number; complianceRate: number }>("/reports/sla-compliance"),
  });

  const { data: aging } = useQuery({
    queryKey: ["reports", "aging"],
    queryFn: () => api.get<Array<{ ticketNumber: string; subject: string; requester: string; status: string; priority: string; ageDays: number }>>("/reports/aging"),
  });

  const { data: monthlyVolume } = useQuery({
    queryKey: ["reports", "monthly-volume"],
    queryFn: () => api.get<Array<{ month: string; count: number }>>("/reports/monthly-volume"),
  });

  const { data: byDepartment } = useQuery({
    queryKey: ["reports", "by-department"],
    queryFn: () => api.get<Array<{ name: string; count: number }>>("/reports/tickets-by-department"),
  });

  const { data: workload } = useQuery({
    queryKey: ["reports", "workload"],
    queryFn: () => api.get<Array<{ name: string; open: number; total: number }>>("/reports/technician-workload"),
  });

  const complianceData = compliance
    ? [
        { name: "Compliant", value: compliance.compliant },
        { name: "Breached", value: compliance.breached },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Reports" description="Operational analytics and SLA compliance." />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{compliance ? formatPercent(compliance.complianceRate) : "-"}</p>
            <p className="text-xs text-muted-foreground">
              {compliance?.compliant ?? 0} compliant / {compliance?.breached ?? 0} breached of {compliance?.total ?? 0} tickets
            </p>
            <div className="mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={complianceData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60}>
                    {complianceData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monthly Ticket Volume</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyVolume ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tickets by Department</CardTitle></CardHeader>
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

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Open Tickets Aging</CardTitle>
            <ExportButton type="aging" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Age (days)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(aging ?? []).slice(0, 10).map((row) => (
                  <TableRow key={row.ticketNumber}>
                    <TableCell className="text-sm font-medium">{row.ticketNumber}</TableCell>
                    <TableCell className="text-sm">{row.priority}</TableCell>
                    <TableCell className="text-sm">{row.status}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{row.ageDays}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Technician Workload</CardTitle>
            <ExportButton type="technician-workload" />
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload ?? []}>
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
      </div>

      <div className="flex flex-wrap gap-2">
        <ExportButton type="tickets-by-priority" />
        <ExportButton type="tickets-by-category" />
        <ExportButton type="tickets-by-department" />
      </div>
    </div>
  );
}
