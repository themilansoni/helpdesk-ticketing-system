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
  PanelLeftClose,
  PanelLeftOpen,
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

interface SidebarProps {
  role: RoleName;
  open: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ role, open, collapsed, onNavigate, onToggleCollapsed }: SidebarProps) {
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

  const toggleGroup = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const rowBase = "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors";
  const rowState = (active: boolean) =>
    cn(
      active
        ? "font-medium text-foreground bg-secondary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-primary"
        : "font-normal text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
    );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-[transform,width] duration-200",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:static lg:translate-x-0",
        collapsed ? "lg:w-[4.5rem]" : "lg:w-64"
      )}
    >
      <div className={cn("flex h-14 items-center gap-2.5 overflow-hidden border-b border-border px-4", collapsed && "lg:justify-center lg:px-0")}>
        <BrandLogo companyName={companyName} companyLogo={companyLogo} heightClass="h-8" className="shrink-0" />
        <div className={cn("min-w-0 flex-1 leading-tight", collapsed && "lg:hidden")}>
          <p className="truncate text-sm font-semibold text-foreground" title={companyName}>
            {companyName}
          </p>
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">IT Service Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-thin">
        {items.map((item) => {
          const Icon = ICONS[item.label] ?? LayoutDashboard;

          if (item.children && item.children.length > 0) {
            const isExpanded = expanded.has(item.label);
            const groupActive = isGroupActive(item);
            return (
              <div key={item.path}>
                <div className="flex items-center rounded-md">
                  <NavLink to={item.path} end onClick={onNavigate} title={item.label} className={cn(rowBase, "flex-1", rowState(groupActive), collapsed && "lg:justify-center lg:px-0")}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                    className={cn("shrink-0 rounded-md p-2 text-muted-foreground/70 transition-colors hover:text-foreground", collapsed && "lg:hidden")}
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>
                {isExpanded && (
                  <div className={cn("ml-[1.5rem] mt-0.5 space-y-0.5 border-l border-border pl-3", collapsed && "lg:hidden")}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                        className={({ isActive }) => cn(rowBase, "px-2.5 py-1.5", rowState(isActive))}
                      >
                        <span className="truncate">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              onClick={onNavigate}
              title={item.label}
              className={({ isActive }) => cn(rowBase, rowState(isActive), collapsed && "lg:justify-center lg:px-0")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className={cn("flex items-center gap-1.5 border-t border-border p-3 text-[11px] text-muted-foreground", collapsed ? "lg:justify-center" : "justify-between")}>
        <div className={cn("flex min-w-0 items-center gap-1.5", collapsed && "lg:hidden")}>
          <ProductLogo className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">HelpDesk Pro v1.0.0</span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:flex"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
