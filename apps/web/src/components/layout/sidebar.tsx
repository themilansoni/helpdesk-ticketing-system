import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  BookOpen,
  Laptop,
  Package,
  Cable,
  KeyRound,
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
  ChevronDown,
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
  Consumables: Package,
  Accessories: Cable,
  Licenses: KeyRound,
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

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
  );

interface SidebarProps {
  role: RoleName;
  open: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ role, open, onNavigate }: SidebarProps) {
  const items = NAV_BY_ROLE[role] ?? [];
  const { companyName, companyLogo } = useCompanyBranding();
  const location = useLocation();

  const isChildActive = (path: string) => location.pathname === path.split("?")[0];
  const isGroupActive = (item: (typeof items)[number]) => isChildActive(item.path) || (item.children?.some((c) => isChildActive(c.path)) ?? false);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const item of items) {
      if (item.children && isGroupActive(item)) initial.add(item.label);
    }
    return initial;
  });

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

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

          if (item.children && item.children.length > 0) {
            const isExpanded = expanded.has(item.label);
            const groupActive = isGroupActive(item);
            return (
              <div key={item.path}>
                <div
                  className={cn(
                    "flex items-center rounded-md transition-colors",
                    groupActive ? "text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <NavLink to={item.path} end onClick={onNavigate} className="flex flex-1 items-center gap-2.5 px-3 py-2 text-sm font-medium">
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => toggle(item.label)}
                    aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                    className="px-2.5 py-2"
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>
                {isExpanded && (
                  <div className="ml-[1.15rem] mt-0.5 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink key={item.path} to={item.path} end={item.path === "/dashboard"} onClick={onNavigate} className={navLinkClass}>
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
