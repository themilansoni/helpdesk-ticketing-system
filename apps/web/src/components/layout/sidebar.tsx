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
  Timer,
  BarChart3,
  ScrollText,
  Settings,
  AlertTriangle,
  ListTodo,
} from "lucide-react";
import { NAV_BY_ROLE, type RoleName } from "@helpdesk/shared";
import { useCompanyBranding } from "@/hooks/use-reference-data";
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
  Priorities: Gauge,
  "SLA Policies": Timer,
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
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-white transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        {companyLogo ? (
          <img src={companyLogo} alt={companyName} className="h-8 w-8 rounded-md object-contain" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            {companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">{companyName}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">IT Service Management</p>
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
      <div className="border-t border-border p-3 text-[11px] text-muted-foreground">HelpDesk Pro v1.0.0</div>
    </aside>
  );
}
