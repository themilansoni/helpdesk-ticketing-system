import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  BookOpen,
  Laptop,
  Bell,
  UserCircle,
  Users,
  Building2,
  Wrench,
  Tags,
  Gauge,
  BarChart3,
  ScrollText,
  Settings,
  AlertTriangle,
  ListTodo,
  Zap,
} from "lucide-react";
import { NAV_BY_ROLE, type RoleName } from "@helpdesk/shared";
import { useCompanyBranding } from "@/hooks/use-reference-data";
import { BrandLogo } from "@/components/common/brand-logo";
import { ProductLogo } from "@/components/common/product-logo";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  "My Tickets": Ticket,
  "All Tickets": Ticket,
  Tickets: Ticket,
  "Create Ticket": PlusCircle,
  "Unassigned Tickets": ListTodo,
  "SLA Breaches": AlertTriangle,
  "Knowledge Base": BookOpen,
  "My Assets": Laptop,
  Assets: Laptop,
  Notifications: Bell,
  Profile: UserCircle,
  Users: Users,
  Departments: Building2,
  Technicians: Wrench,
  Categories: Tags,
  "Priorities & SLA": Gauge,
  Automation: Zap,
  Reports: BarChart3,
  "Audit Logs": ScrollText,
  "System Settings": Settings,
};

interface SidebarProps {
  role: RoleName;
  open: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ role, open, onNavigate }: SidebarProps) {
  const items = NAV_BY_ROLE[role] ?? [];
  const { companyName, companyLogo } = useCompanyBranding();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-14 items-center gap-2.5 overflow-hidden border-b border-border px-4">
        <BrandLogo companyName={companyName} companyLogo={companyLogo} heightClass="h-8" className="shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold text-foreground" title={companyName}>
            {companyName}
          </p>
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">IT Service Management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
        {items.map((item) => {
          const Icon = ICONS[item.label] ?? LayoutDashboard;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="flex items-center gap-1.5 border-t border-border p-3 text-[11px] text-muted-foreground">
        <ProductLogo className="h-3.5 w-3.5" />
        HelpDesk Pro v1.0.0
      </div>
    </aside>
  );
}
