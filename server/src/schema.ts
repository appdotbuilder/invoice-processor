
import { z } from 'zod';

// Vendor schema
export const vendorSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Vendor = z.infer<typeof vendorSchema>;

// Line item schema
export const lineItemSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type LineItem = z.infer<typeof lineItemSchema>;

// Invoice schema
export const invoiceSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  vendor_id: z.number(),
  invoice_date: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  total_amount: z.number(),
  status: z.enum(['pending', 'processed', 'paid', 'overdue']),
  file_path: z.string().nullable(),
  original_filename: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

// Complete invoice with relations
export const invoiceWithDetailsSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  vendor_id: z.number(),
  invoice_date: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  total_amount: z.number(),
  status: z.enum(['pending', 'processed', 'paid', 'overdue']),
  file_path: z.string().nullable(),
  original_filename: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  vendor: vendorSchema,
  line_items: z.array(lineItemSchema)
});

export type InvoiceWithDetails = z.infer<typeof invoiceWithDetailsSchema>;

// Input schemas for creating
export const createVendorInputSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  address: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional()
});

export type CreateVendorInput = z.infer<typeof createVendorInputSchema>;

export const createLineItemInputSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit_price: z.number().positive("Unit price must be positive"),
  total_price: z.number().positive("Total price must be positive")
});

export type CreateLineItemInput = z.infer<typeof createLineItemInputSchema>;

export const createInvoiceInputSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  vendor: createVendorInputSchema,
  invoice_date: z.coerce.date(),
  due_date: z.coerce.date().nullable().optional(),
  total_amount: z.number().positive("Total amount must be positive"),
  status: z.enum(['pending', 'processed', 'paid', 'overdue']).default('pending'),
  file_path: z.string().nullable().optional(),
  original_filename: z.string().nullable().optional(),
  line_items: z.array(createLineItemInputSchema).min(1, "At least one line item is required")
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

// Input schemas for updating
export const updateInvoiceInputSchema = z.object({
  id: z.number(),
  invoice_number: z.string().min(1).optional(),
  invoice_date: z.coerce.date().optional(),
  due_date: z.coerce.date().nullable().optional(),
  total_amount: z.number().positive().optional(),
  status: z.enum(['pending', 'processed', 'paid', 'overdue']).optional()
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

// File upload schema
export const uploadInvoiceInputSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  content_type: z.string().min(1, "Content type is required"),
  file_data: z.string().min(1, "File data is required") // Base64 encoded file data
});

export type UploadInvoiceInput = z.infer<typeof uploadInvoiceInputSchema>;

// Query schemas
export const getInvoicesQuerySchema = z.object({
  status: z.enum(['pending', 'processed', 'paid', 'overdue']).optional(),
  vendor_id: z.number().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetInvoicesQuery = z.infer<typeof getInvoicesQuerySchema>;

export const getInvoiceByIdInputSchema = z.object({
  id: z.number().positive("Invoice ID must be positive")
});

export type GetInvoiceByIdInput = z.infer<typeof getInvoiceByIdInputSchema>;
