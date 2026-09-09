import { z } from "zod";
import { CONTACT_METHODS, PENDING_REASONS, ROLES } from "./constants.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  description: z.string().min(10, "Please describe the issue in more detail").max(5000),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().optional().nullable(),
  priorityId: z.string().min(1, "Priority is required"),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
  preferredContactMethod: z.enum(CONTACT_METHODS).default("email"),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketStatusSchema = z.object({
  statusId: z.string().min(1),
  pendingReason: z.enum(PENDING_REASONS).optional().nullable(),
  comment: z.string().max(5000).optional(),
});
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

export const updateTicketPrioritySchema = z.object({
  priorityId: z.string().min(1),
});

export const assignTicketSchema = z.object({
  technicianId: z.string().min(1),
});

export const addCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(5000),
  isInternal: z.boolean().default(false),
});
export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const createUserSchema = z.object({
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleName: z.enum(ROLES),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const createAssetSchema = z.object({
  assetTag: z.string().min(1),
  serialNumber: z.string().optional().nullable(),
  assetTypeId: z.string().min(1),
  manufacturerId: z.string().optional().nullable(),
  assetModelId: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  status: z.enum(["available", "assigned", "in_repair", "retired", "lost"]).default("available"),
  departmentId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const createManufacturerSchema = z.object({
  name: z.string().min(1),
  supportUrl: z.string().optional().nullable(),
  supportPhone: z.string().optional().nullable(),
});
export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;

export const createAssetModelSchema = z.object({
  name: z.string().min(1),
  manufacturerId: z.string().optional().nullable(),
  assetTypeId: z.string().optional().nullable(),
});
export type CreateAssetModelInput = z.infer<typeof createAssetModelSchema>;

export const createConsumableSchema = z.object({
  name: z.string().min(1),
  manufacturer: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  quantityTotal: z.number().int().min(0),
  minQuantity: z.number().int().min(0).default(0),
  locationId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateConsumableInput = z.infer<typeof createConsumableSchema>;

export const createAccessorySchema = z.object({
  name: z.string().min(1),
  manufacturer: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  quantityTotal: z.number().int().min(0),
  locationId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateAccessoryInput = z.infer<typeof createAccessorySchema>;

export const createLicenseSchema = z.object({
  name: z.string().min(1),
  manufacturer: z.string().optional().nullable(),
  licenseKey: z.string().optional().nullable(),
  seatsTotal: z.number().int().min(1),
  purchaseDate: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;

export const createKnowledgeArticleSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
});
export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const createSubcategorySchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
});

export const updateSlaPolicySchema = z.object({
  firstResponseMinutes: z.number().int().positive(),
  resolutionMinutes: z.number().int().positive(),
  businessHoursOnly: z.boolean().default(false),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
