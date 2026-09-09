import type { RoleName } from "./constants.js";

// Central RBAC capability matrix. Both the API (enforcement) and the web
// app (conditional UI) read from this single source of truth so the two
// never drift out of sync.
export const PERMISSIONS = {
  TICKET_VIEW_ALL: ["Technician", "Manager", "Administrator"],
  TICKET_VIEW_OWN: ["Employee", "Technician", "Manager", "Administrator"],
  TICKET_CREATE: ["Employee", "Technician", "Manager", "Administrator"],
  TICKET_ASSIGN: ["Technician", "Manager", "Administrator"],
  TICKET_CHANGE_STATUS: ["Technician", "Manager", "Administrator"],
  TICKET_CHANGE_PRIORITY: ["Technician", "Manager", "Administrator"],
  TICKET_ADD_INTERNAL_NOTE: ["Technician", "Manager", "Administrator"],
  TICKET_ESCALATE: ["Technician", "Manager", "Administrator"],
  TICKET_DELETE: ["Administrator"],
  USER_MANAGE: ["Administrator"],
  DEPARTMENT_MANAGE: ["Administrator"],
  CATEGORY_MANAGE: ["Administrator"],
  PRIORITY_MANAGE: ["Administrator"],
  SLA_MANAGE: ["Administrator"],
  ASSET_VIEW: ["Employee", "Technician", "Manager", "Administrator"],
  ASSET_MANAGE: ["Technician", "Administrator"],
  KNOWLEDGE_VIEW: ["Employee", "Technician", "Manager", "Administrator"],
  KNOWLEDGE_MANAGE: ["Technician", "Administrator"],
  REPORTS_VIEW: ["Technician", "Manager", "Administrator"],
  AUDIT_LOG_VIEW: ["Administrator"],
  SYSTEM_SETTINGS_MANAGE: ["Administrator"],
  AUTOMATION_MANAGE: ["Administrator"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: RoleName | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export const NAV_BY_ROLE: Record<RoleName, Array<{ label: string; path: string }>> = {
  Employee: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "My Tickets", path: "/tickets" },
    { label: "Create Ticket", path: "/tickets/new" },
    { label: "Knowledge Base", path: "/knowledge-base" },
    { label: "My Assets", path: "/assets" },
    { label: "Notifications", path: "/notifications" },
    { label: "Profile", path: "/profile" },
  ],
  Technician: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "All Tickets", path: "/tickets" },
    { label: "My Tickets", path: "/tickets?assignee=me" },
    { label: "Unassigned Tickets", path: "/tickets?unassigned=1" },
    { label: "SLA Breaches", path: "/tickets?sla=breached" },
    { label: "Knowledge Base", path: "/knowledge-base" },
    { label: "Assets", path: "/assets" },
    { label: "Consumables", path: "/consumables" },
    { label: "Accessories", path: "/accessories" },
    { label: "Licenses", path: "/licenses" },
    { label: "Reports", path: "/reports" },
  ],
  Manager: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "All Tickets", path: "/tickets" },
    { label: "My Tickets", path: "/tickets?assignee=me" },
    { label: "Knowledge Base", path: "/knowledge-base" },
    { label: "Assets", path: "/assets" },
    { label: "Consumables", path: "/consumables" },
    { label: "Accessories", path: "/accessories" },
    { label: "Licenses", path: "/licenses" },
    { label: "Reports", path: "/reports" },
    { label: "Notifications", path: "/notifications" },
    { label: "Profile", path: "/profile" },
  ],
  Administrator: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Tickets", path: "/tickets" },
    { label: "Users", path: "/admin/users" },
    { label: "Departments", path: "/admin/departments" },
    { label: "Technicians", path: "/admin/users?role=Technician" },
    { label: "Categories", path: "/admin/categories" },
    { label: "Priorities & SLA", path: "/admin/priorities" },
    { label: "Automation", path: "/admin/automation" },
    { label: "Assets", path: "/assets" },
    { label: "Consumables", path: "/consumables" },
    { label: "Accessories", path: "/accessories" },
    { label: "Licenses", path: "/licenses" },
    { label: "Knowledge Base", path: "/knowledge-base" },
    { label: "Reports", path: "/reports" },
    { label: "Audit Logs", path: "/admin/audit-logs" },
    { label: "System Settings", path: "/admin/settings" },
  ],
};
