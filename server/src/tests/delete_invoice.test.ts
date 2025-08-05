
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable, invoicesTable, lineItemsTable } from '../db/schema';
import { type GetInvoiceByIdInput } from '../schema';
import { deleteInvoice } from '../handlers/delete_invoice';
import { eq } from 'drizzle-orm';

const testInput: GetInvoiceByIdInput = {
  id: 1
};

describe('deleteInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an invoice and return success', async () => {
    // Create vendor first
    const vendor = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St',
        email: 'test@vendor.com',
        phone: '555-0123'
      })
      .returning()
      .execute();

    // Create invoice
    const invoice = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-001',
        vendor_id: vendor[0].id,
        invoice_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '100.50',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create line items
    await db.insert(lineItemsTable)
      .values([
        {
          invoice_id: invoice[0].id,
          description: 'Item 1',
          quantity: '2.000',
          unit_price: '25.25',
          total_price: '50.50'
        },
        {
          invoice_id: invoice[0].id,
          description: 'Item 2',
          quantity: '1.000',
          unit_price: '50.00',
          total_price: '50.00'
        }
      ])
      .execute();

    const result = await deleteInvoice({ id: invoice[0].id });

    expect(result.success).toBe(true);
    expect(result.deleted_id).toBe(invoice[0].id);
  });

  it('should remove invoice from database', async () => {
    // Create vendor first
    const vendor = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St',
        email: 'test@vendor.com',
        phone: '555-0123'
      })
      .returning()
      .execute();

    // Create invoice
    const invoice = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-001',
        vendor_id: vendor[0].id,
        invoice_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '100.50',
        status: 'pending'
      })
      .returning()
      .execute();

    await deleteInvoice({ id: invoice[0].id });

    // Verify invoice is deleted
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice[0].id))
      .execute();

    expect(invoices).toHaveLength(0);
  });

  it('should cascade delete line items', async () => {
    // Create vendor first
    const vendor = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St',
        email: 'test@vendor.com',
        phone: '555-0123'
      })
      .returning()
      .execute();

    // Create invoice
    const invoice = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-001',
        vendor_id: vendor[0].id,
        invoice_date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '100.50',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create line items
    await db.insert(lineItemsTable)
      .values([
        {
          invoice_id: invoice[0].id,
          description: 'Item 1',
          quantity: '2.000',
          unit_price: '25.25',
          total_price: '50.50'
        },
        {
          invoice_id: invoice[0].id,
          description: 'Item 2',
          quantity: '1.000',
          unit_price: '50.00',
          total_price: '50.00'
        }
      ])
      .execute();

    await deleteInvoice({ id: invoice[0].id });

    // Verify line items are deleted due to cascade
    const lineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, invoice[0].id))
      .execute();

    expect(lineItems).toHaveLength(0);
  });

  it('should return failure for non-existent invoice', async () => {
    const result = await deleteInvoice({ id: 999 });

    expect(result.success).toBe(false);
    expect(result.deleted_id).toBe(null);
  });

  it('should not affect other invoices', async () => {
    // Create vendor first
    const vendor = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St',
        email: 'test@vendor.com',
        phone: '555-0123'
      })
      .returning()
      .execute();

    // Create two invoices
    const invoices = await db.insert(invoicesTable)
      .values([
        {
          invoice_number: 'INV-001',
          vendor_id: vendor[0].id,
          invoice_date: new Date('2024-01-01'),
          due_date: new Date('2024-01-31'),
          total_amount: '100.50',
          status: 'pending'
        },
        {
          invoice_number: 'INV-002',
          vendor_id: vendor[0].id,
          invoice_date: new Date('2024-01-02'),
          due_date: new Date('2024-02-01'),
          total_amount: '200.75',
          status: 'processed'
        }
      ])
      .returning()
      .execute();

    // Delete first invoice
    await deleteInvoice({ id: invoices[0].id });

    // Verify second invoice still exists
    const remainingInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoices[1].id))
      .execute();

    expect(remainingInvoices).toHaveLength(1);
    expect(remainingInvoices[0].invoice_number).toBe('INV-002');
  });
});
