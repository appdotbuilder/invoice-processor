
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable, invoicesTable, lineItemsTable } from '../db/schema';
import { type CreateInvoiceInput } from '../schema';
import { createInvoice } from '../handlers/create_invoice';
import { eq } from 'drizzle-orm';

const testInput: CreateInvoiceInput = {
  invoice_number: 'INV-001',
  vendor: {
    name: 'Test Vendor Inc',
    address: '123 Test Street',
    email: 'vendor@test.com',
    phone: '555-0123'
  },
  invoice_date: new Date('2024-01-15'),
  due_date: new Date('2024-02-15'),
  total_amount: 250.50,
  status: 'pending',
  file_path: '/uploads/invoice-001.pdf',
  original_filename: 'invoice-001.pdf',
  line_items: [
    {
      description: 'Consulting Services',
      quantity: 2,
      unit_price: 100.00,
      total_price: 200.00
    },
    {
      description: 'Processing Fee',
      quantity: 1,
      unit_price: 50.50,
      total_price: 50.50
    }
  ]
};

describe('createInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create invoice with new vendor and line items', async () => {
    const result = await createInvoice(testInput);

    // Validate invoice fields
    expect(result.invoice_number).toEqual('INV-001');
    expect(result.invoice_date).toBeInstanceOf(Date);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.total_amount).toEqual(250.50);
    expect(typeof result.total_amount).toBe('number');
    expect(result.status).toEqual('pending');
    expect(result.file_path).toEqual('/uploads/invoice-001.pdf');
    expect(result.original_filename).toEqual('invoice-001.pdf');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Validate vendor
    expect(result.vendor.name).toEqual('Test Vendor Inc');
    expect(result.vendor.address).toEqual('123 Test Street');
    expect(result.vendor.email).toEqual('vendor@test.com');
    expect(result.vendor.phone).toEqual('555-0123');
    expect(result.vendor.id).toBeDefined();

    // Validate line items
    expect(result.line_items).toHaveLength(2);
    
    const firstItem = result.line_items[0];
    expect(firstItem.description).toEqual('Consulting Services');
    expect(firstItem.quantity).toEqual(2);
    expect(typeof firstItem.quantity).toBe('number');
    expect(firstItem.unit_price).toEqual(100.00);
    expect(typeof firstItem.unit_price).toBe('number');
    expect(firstItem.total_price).toEqual(200.00);
    expect(typeof firstItem.total_price).toBe('number');

    const secondItem = result.line_items[1];
    expect(secondItem.description).toEqual('Processing Fee');
    expect(secondItem.quantity).toEqual(1);
    expect(secondItem.unit_price).toEqual(50.50);
    expect(secondItem.total_price).toEqual(50.50);
  });

  it('should save data to database correctly', async () => {
    const result = await createInvoice(testInput);

    // Check vendor was saved
    const vendors = await db.select()
      .from(vendorsTable)
      .where(eq(vendorsTable.id, result.vendor.id))
      .execute();
    
    expect(vendors).toHaveLength(1);
    expect(vendors[0].name).toEqual('Test Vendor Inc');
    expect(vendors[0].email).toEqual('vendor@test.com');

    // Check invoice was saved
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();
    
    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoice_number).toEqual('INV-001');
    expect(parseFloat(invoices[0].total_amount)).toEqual(250.50);
    expect(invoices[0].vendor_id).toEqual(result.vendor.id);

    // Check line items were saved
    const lineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, result.id))
      .execute();
    
    expect(lineItems).toHaveLength(2);
    expect(lineItems[0].description).toEqual('Consulting Services');
    expect(parseFloat(lineItems[0].quantity)).toEqual(2);
    expect(parseFloat(lineItems[0].unit_price)).toEqual(100.00);
    expect(parseFloat(lineItems[0].total_price)).toEqual(200.00);
  });

  it('should reuse existing vendor by name', async () => {
    // Create initial vendor
    const existingVendor = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor Inc',
        address: 'Different Address',
        email: 'different@email.com',
        phone: '999-9999'
      })
      .returning()
      .execute();

    const result = await createInvoice(testInput);

    // Should reuse existing vendor
    expect(result.vendor.id).toEqual(existingVendor[0].id);
    expect(result.vendor.name).toEqual('Test Vendor Inc');
    expect(result.vendor.address).toEqual('Different Address'); // Original vendor data preserved
    expect(result.vendor.email).toEqual('different@email.com');

    // Verify only one vendor exists
    const allVendors = await db.select().from(vendorsTable).execute();
    expect(allVendors).toHaveLength(1);
  });

  it('should reuse existing vendor by email', async () => {
    // Create initial vendor with same email but different name
    const existingVendor = await db.insert(vendorsTable)
      .values({
        name: 'Different Vendor Name',
        address: 'Old Address',
        email: 'vendor@test.com',
        phone: '111-1111'
      })
      .returning()
      .execute();

    const result = await createInvoice(testInput);

    // Should reuse existing vendor based on email match
    expect(result.vendor.id).toEqual(existingVendor[0].id);
    expect(result.vendor.name).toEqual('Different Vendor Name'); // Original name preserved
    expect(result.vendor.email).toEqual('vendor@test.com');

    // Verify only one vendor exists
    const allVendors = await db.select().from(vendorsTable).execute();
    expect(allVendors).toHaveLength(1);
  });

  it('should handle nullable fields correctly', async () => {
    const minimalInput: CreateInvoiceInput = {
      invoice_number: 'INV-002',
      vendor: {
        name: 'Minimal Vendor',
        address: null,
        email: null,
        phone: null
      },
      invoice_date: new Date('2024-01-20'),
      due_date: null,
      total_amount: 100.00,
      status: 'pending',
      file_path: null,
      original_filename: null,
      line_items: [
        {
          description: 'Basic Service',
          quantity: 1,
          unit_price: 100.00,
          total_price: 100.00
        }
      ]
    };

    const result = await createInvoice(minimalInput);

    expect(result.vendor.address).toBeNull();
    expect(result.vendor.email).toBeNull();
    expect(result.vendor.phone).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.file_path).toBeNull();
    expect(result.original_filename).toBeNull();
  });
});
