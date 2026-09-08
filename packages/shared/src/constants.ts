export const ROLES = ["Employee", "Technician", "Manager", "Administrator"] as const;
export type RoleName = (typeof ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PRIORITY_NAMES = ["Low", "Medium", "High", "Critical"] as const;
export type PriorityName = (typeof PRIORITY_NAMES)[number];

export const TICKET_STATUS_NAMES = [
  "New",
  "Open",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
  "Reopened",
] as const;
export type TicketStatusName = (typeof TICKET_STATUS_NAMES)[number];

export const PENDING_REASONS = [
  "waiting_for_user",
  "waiting_for_vendor",
  "waiting_for_approval",
  "waiting_for_hardware",
  "other",
] as const;
export type PendingReason = (typeof PENDING_REASONS)[number];

export const PENDING_REASON_LABELS: Record<PendingReason, string> = {
  waiting_for_user: "Waiting for user",
  waiting_for_vendor: "Waiting for vendor",
  waiting_for_approval: "Waiting for approval",
  waiting_for_hardware: "Waiting for hardware",
  other: "Other",
};

export const CONTACT_METHODS = ["email", "phone", "chat"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const ASSET_STATUSES = ["available", "assigned", "in_repair", "retired", "lost"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const KNOWLEDGE_ARTICLE_STATUSES = ["draft", "published"] as const;
export type KnowledgeArticleStatus = (typeof KNOWLEDGE_ARTICLE_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "ticket_created",
  "ticket_assigned",
  "status_changed",
  "priority_changed",
  "technician_reply",
  "employee_reply",
  "ticket_resolved",
  "ticket_reopened",
  "sla_at_risk",
  "sla_breached",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TICKET_HISTORY_ACTIONS = [
  "created",
  "status_changed",
  "priority_changed",
  "assigned",
  "unassigned",
  "escalated",
  "note_added",
  "replied",
  "resolved",
  "closed",
  "reopened",
] as const;
export type TicketHistoryAction = (typeof TICKET_HISTORY_ACTIONS)[number];

export const SLA_HEALTH = ["healthy", "at_risk", "breached"] as const;
export type SlaHealth = (typeof SLA_HEALTH)[number];

// Fixed metadata for the ticket workflow. There's no "statuses" database
// table in the Firestore data model (the workflow is fixed, not
// admin-editable), so this is the single source of truth both the client
// data layer and firestore.rules logic are written against.
export const STATUS_META: Record<TicketStatusName, { order: number; isClosed: boolean; isDefault: boolean }> = {
  New: { order: 0, isClosed: false, isDefault: true },
  Open: { order: 1, isClosed: false, isDefault: false },
  "In Progress": { order: 2, isClosed: false, isDefault: false },
  Pending: { order: 3, isClosed: false, isDefault: false },
  Resolved: { order: 4, isClosed: false, isDefault: false },
  Closed: { order: 5, isClosed: true, isDefault: false },
  Reopened: { order: 6, isClosed: false, isDefault: false },
};

// Allowed forward transitions in the ticket status workflow.
// Closed -> Reopened is the only "backward" transition, then Reopened behaves like Open.
export const STATUS_TRANSITIONS: Record<TicketStatusName, TicketStatusName[]> = {
  New: ["Open", "In Progress", "Pending", "Resolved", "Closed"],
  Open: ["In Progress", "Pending", "Resolved", "Closed"],
  "In Progress": ["Pending", "Resolved", "Closed", "Open"],
  Pending: ["Open", "In Progress", "Resolved", "Closed"],
  Resolved: ["Closed", "Reopened", "In Progress"],
  Closed: ["Reopened"],
  Reopened: ["Open", "In Progress", "Pending", "Resolved", "Closed"],
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const TICKET_NUMBER_REGEX = /^HD-\d{4}-\d{6}$/;
