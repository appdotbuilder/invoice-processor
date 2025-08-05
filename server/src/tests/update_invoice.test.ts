
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable, invoicesTable, lineItemsTable } from '../db/schema';
import { type UpdateInvoiceInput } from '../schema';
import { updateInvoice } from '../handlers/update_invoice';
import { eq } from 'drizzle-orm';

describe('updateInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testVendorId: number;
  let testInvoiceId: number;

  beforeEach(async () => {
    // Create test vendor
    const vendors = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St',
        email: 'test@vendor.com',
        phone: '555-0123'
      })
      .returning()
      .execute();
    
    testVendorId = vendors[0].id;

    // Create test invoice
    const invoices = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-001',
        vendor_id: testVendorId,
        invoice_date: new Date('2024-01-15'),
        due_date: new Date('2024-02-15'),
        total_amount: '1000.00',
        status: 'pending'
      })
      .returning()
      .execute();
    
    testInvoiceId = invoices[0].id;

    // Create test line items
    await db.insert(lineItemsTable)
      .values([
        {
          invoice_id: testInvoiceId,
          description: 'Test Item 1',
          quantity: '2.000',
          unit_price: '250.00',
          total_price: '500.00'
        },
        {
          invoice_id: testInvoiceId,
          description: 'Test Item 2',
          quantity: '1.000',
          unit_price: '500.00',
          total_price: '500.00'
        }
      ])
      .execute();
  });

  it('should update invoice with single field', async () => {
    const input: UpdateInvoiceInput = {
      id: testInvoiceId,
      status: 'paid'
    };

    const result = await updateInvoice(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testInvoiceId);
    expect(result!.status).toEqual('paid');
    expect(result!.invoice_number).toEqual('INV-001'); // Should remain unchanged
    expect(result!.total_amount).toEqual(1000);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update invoice with multiple fields', async () => {
    const newDate = new Date('2024-02-01');
    const input: UpdateInvoiceInput = {
      id: testInvoiceId,
      invoice_number: 'INV-001-UPDATED',
      total_amount: 1500.50,
      status: 'processed',
      invoice_date: newDate
    };

    const result = await updateInvoice(input);

    expect(result).not.toBeNull();
    expect(result!.invoice_number).toEqual('INV-001-UPDATED');
    expect(result!.total_amount).toEqual(1500.50);
    expect(result!.status).toEqual('processed');
    expect(result!.invoice_date).toEqual(newDate);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update due_date to null', async () => {
    const input: UpdateInvoiceInput = {
      id: testInvoiceId,
      due_date: null
    };

    const result = await updateInvoice(input);

    expect(result).not.toBeNull();
    expect(result!.due_date).toBeNull();
  });

  it('should return complete invoice with vendor and line items', async () => {
    const input: UpdateInvoiceInput = {
      id: testInvoiceId,
      status: 'paid'
    };

    const result = await updateInvoice(input);

    expect(result).not.toBeNull();
    
    // Check vendor relation
    expect(result!.vendor).toBeDefined();
    expect(result!.vendor.id).toEqual(testVendorId);
    expect(result!.vendor.name).toEqual('Test Vendor');
    expect(result!.vendor.address).toEqual('123 Test St');

    // Check line items relation
    expect(result!.line_items).toBeDefined();
    expect(result!.line_items).toHaveLength(2);
    expect(result!.line_items[0].description).toEqual('Test Item 1');
    expect(result!.line_items[0].quantity).toEqual(2);
    expect(result!.line_items[0].unit_price).toEqual(250);
    expect(result!.line_items[0].total_price).toEqual(500);
    expect(typeof result!.line_items[0].quantity).toBe('number');
    expect(typeof result!.line_items[0].unit_price).toBe('number');
    expect(typeof result!.line_items[0].total_price).toBe('number');
  });

  it('should persist changes to database', async () => {
    const input: UpdateInvoiceInput = {
      id: testInvoiceId,
      status: 'paid',
      total_amount: 1200.75
    };

    await updateInvoice(input);

    // Verify changes in database
    const dbInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, testInvoiceId))
      .execute();

    expect(dbInvoice).toHaveLength(1);
    expect(dbInvoice[0].status).toEqual('paid');
    expect(parseFloat(dbInvoice[0].total_amount)).toEqual(1200.75);
    expect(dbInvoice[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent invoice', async () => {
    const input: UpdateInvoiceInput = {
      id: 99999,
      status: 'paid'
    };

    const result = await updateInvoice(input);

    expect(result).toBeNull();
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, testInvoiceId))
      .execute();
    
    const originalUpdatedAt = originalInvoice[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateInvoiceInput = {
      id: testInvoiceId,
      status: 'processed'
    };

    const result = await updateInvoice(input);

    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
