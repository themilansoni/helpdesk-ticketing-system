import type { RoleName, SlaHealth } from "@helpdesk/shared";

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CurrentUser {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  lastLoginAt: string | null;
  role: { id: string; name: RoleName };
  department: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  managerId: string | null;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
}

export interface Priority {
  id: string;
  name: string;
  level: number;
  colorHex: string;
  slaPolicy?: SlaPolicy | null;
}

export interface SlaPolicy {
  id: string;
  priorityId: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
}

export interface TicketStatus {
  id: string;
  name: string;
  order: number;
  isClosed: boolean;
  isDefault: boolean;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  subcategories: TicketSubcategory[];
}

export interface TicketSubcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface AssetType {
  id: string;
  name: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  assetType: AssetType;
  manufacturer: string | null;
  model: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  status: string;
  assignedUser: UserSummary | null;
  department: Department | null;
  location: Location | null;
  notes: string | null;
  createdAt: string;
  tickets?: Array<{ id: string; ticketNumber: string; subject: string }>;
}

export interface SlaInfo {
  firstResponseHealth: SlaHealth;
  resolutionHealth: SlaHealth;
  resolutionPercentElapsed: number;
  resolutionMsRemaining: number;
  overallHealth: SlaHealth;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  requester: UserSummary & { employeeId: string };
  department: Department | null;
  location: Location | null;
  category: TicketCategory;
  subcategory: TicketSubcategory | null;
  priority: Priority;
  status: TicketStatus;
  assignedTechnician: UserSummary | null;
  asset: { id: string; assetTag: string; model: string | null } | null;
  preferredContactMethod: string;
  pendingReason: string | null;
  slaFirstResponseDeadline: string | null;
  slaResolutionDeadline: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenedCount: number;
  createdAt: string;
  updatedAt: string;
  sla: SlaInfo;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  author: UserSummary;
  body: string;
  isInternal: boolean;
  createdAt: string;
  attachments: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  userId: string | null;
  user: { firstName: string; lastName: string } | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  tagsCsv: string;
  status: string;
  category: KnowledgeCategory;
  author: { id: string; firstName: string; lastName: string };
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  user: { firstName: string; lastName: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
