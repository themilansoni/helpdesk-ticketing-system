import type { RoleName, SlaHealth, TicketStatusName } from "@helpdesk/shared";

// Firestore document shapes, as consumed by the app (timestamps already
// normalized to ISO strings by the data-access layer in src/lib/db).

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CurrentUser {
  id: string; // Firebase Auth UID, also the Firestore doc id in `users`
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  lastLoginAt: string | null;
  role: { name: RoleName };
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

export interface SlaPolicy {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
}

export interface Priority {
  id: string;
  name: string;
  level: number;
  colorHex: string;
  slaPolicy: SlaPolicy;
}

export interface TicketStatus {
  name: TicketStatusName;
  order: number;
  isClosed: boolean;
  isDefault: boolean;
}

export interface TicketSubcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  subcategories: TicketSubcategory[];
}

export interface AssetType {
  id: string;
  name: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  supportUrl: string | null;
  supportPhone: string | null;
}

export interface AssetModel {
  id: string;
  name: string;
  manufacturer: { id: string; name: string } | null;
  assetType: { id: string; name: string } | null;
}

export interface Asset {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  assetType: AssetType;
  manufacturerId: string | null;
  manufacturer: string | null;
  assetModelId: string | null;
  model: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  status: string;
  assignedUser: UserSummary | null;
  department: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
}

export interface AssetHistoryEntry {
  id: string;
  assetId: string;
  userId: string | null;
  user: { firstName: string; lastName: string } | null;
  action: string;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  note: string | null;
  createdAt: string;
}

export interface Consumable {
  id: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  quantityTotal: number;
  quantityRemaining: number;
  minQuantity: number;
  location: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
}

export interface ConsumableCheckout {
  id: string;
  consumableId: string;
  user: { id: string; firstName: string; lastName: string };
  quantity: number;
  createdAt: string;
}

export interface Accessory {
  id: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  quantityTotal: number;
  quantityRemaining: number;
  location: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
}

export interface AccessoryCheckout {
  id: string;
  accessoryId: string;
  user: { id: string; firstName: string; lastName: string };
  quantity: number;
  checkedOutAt: string;
  checkedInAt: string | null;
}

export interface License {
  id: string;
  name: string;
  manufacturer: string | null;
  licenseKey: string | null;
  seatsTotal: number;
  seatsUsed: number;
  purchaseDate: string | null;
  expirationDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface LicenseCheckout {
  id: string;
  licenseId: string;
  user: { id: string; firstName: string; lastName: string };
  checkedOutAt: string;
  checkedInAt: string | null;
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
  department: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  category: { id: string; name: string };
  subcategory: { id: string; name: string } | null;
  priority: { id: string; name: string; level: number; colorHex: string };
  status: TicketStatusName;
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
  attachments: TicketAttachmentMeta[];
  tags: string[];
}

export interface BusinessRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  keyword: string;
  setCategoryId: string | null;
  setCategoryName: string | null;
  setPriorityId: string | null;
  setPriorityName: string | null;
  setDepartmentId: string | null;
  setDepartmentName: string | null;
  assignTechnicianId: string | null;
  assignTechnicianName: string | null;
  addTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketAttachmentMeta {
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  author: UserSummary;
  body: string;
  isInternal: boolean;
  createdAt: string;
  attachments: TicketAttachmentMeta[];
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
  userId: string;
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
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
