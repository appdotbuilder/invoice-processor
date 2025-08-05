
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for invoice status
export const invoiceStatusEnum = pgEnum('invoice_status', ['pending', 'processed', 'paid', 'overdue']);

// Vendors table
export const vendorsTable = pgTable('vendors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  email: text('email'),
  phone: text('phone'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Invoices table
export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoice_number: text('invoice_number').notNull(),
  vendor_id: integer('vendor_id').notNull().references(() => vendorsTable.id),
  invoice_date: timestamp('invoice_date').notNull(),
  due_date: timestamp('due_date'),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').notNull().default('pending'),
  file_path: text('file_path'),
  original_filename: text('original_filename'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Line items table
export const lineItemsTable = pgTable('line_items', {
  id: serial('id').primaryKey(),
  invoice_id: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const vendorsRelations = relations(vendorsTable, ({ many }) => ({
  invoices: many(invoicesTable),
}));

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  vendor: one(vendorsTable, {
    fields: [invoicesTable.vendor_id],
    references: [vendorsTable.id],
  }),
  line_items: many(lineItemsTable),
}));

export const lineItemsRelations = relations(lineItemsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [lineItemsTable.invoice_id],
    references: [invoicesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Vendor = typeof vendorsTable.$inferSelect;
export type NewVendor = typeof vendorsTable.$inferInsert;
export type Invoice = typeof invoicesTable.$inferSelect;
export type NewInvoice = typeof invoicesTable.$inferInsert;
export type LineItem = typeof lineItemsTable.$inferSelect;
export type NewLineItem = typeof lineItemsTable.$inferInsert;

// Export all tables for proper query building
export const tables = { 
  vendors: vendorsTable, 
  invoices: invoicesTable, 
  line_items: lineItemsTable 
};
