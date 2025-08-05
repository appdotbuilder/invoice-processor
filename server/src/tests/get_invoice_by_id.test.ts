
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable, invoicesTable, lineItemsTable } from '../db/schema';
import { type GetInvoiceByIdInput } from '../schema';
import { getInvoiceById } from '../handlers/get_invoice_by_id';

// Test data
const testVendor = {
  name: 'Test Vendor',
  address: '123 Test St',
  email: 'vendor@test.com',
  phone: '555-1234'
};

const testInvoice = {
  invoice_number: 'INV-001',
  invoice_date: new Date('2024-01-15'),
  due_date: new Date('2024-02-15'),
  total_amount: '1500.00',
  status: 'pending' as const,
  file_path: '/path/to/file.pdf',
  original_filename: 'invoice.pdf'
};

const testLineItems = [
  {
    description: 'Product A',
    quantity: '2.000',
    unit_price: '500.00',
    total_price: '1000.00'
  },
  {
    description: 'Product B',
    quantity: '1.000',
    unit_price: '500.00',
    total_price: '500.00'
  }
];

describe('getInvoiceById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return invoice with vendor and line items', async () => {
    // Create vendor
    const vendorResult = await db.insert(vendorsTable)
      .values(testVendor)
      .returning()
      .execute();
    const vendor = vendorResult[0];

    // Create invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        ...testInvoice,
        vendor_id: vendor.id
      })
      .returning()
      .execute();
    const invoice = invoiceResult[0];

    // Create line items
    await db.insert(lineItemsTable)
      .values(testLineItems.map(item => ({
        ...item,
        invoice_id: invoice.id
      })))
      .execute();

    const input: GetInvoiceByIdInput = { id: invoice.id };
    const result = await getInvoiceById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(invoice.id);
    expect(result!.invoice_number).toEqual('INV-001');
    expect(result!.total_amount).toEqual(1500.00);
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.status).toEqual('pending');
    expect(result!.invoice_date).toBeInstanceOf(Date);
    expect(result!.due_date).toBeInstanceOf(Date);
    expect(result!.file_path).toEqual('/path/to/file.pdf');
    expect(result!.original_filename).toEqual('invoice.pdf');

    // Verify vendor data
    expect(result!.vendor.id).toEqual(vendor.id);
    expect(result!.vendor.name).toEqual('Test Vendor');
    expect(result!.vendor.address).toEqual('123 Test St');
    expect(result!.vendor.email).toEqual('vendor@test.com');
    expect(result!.vendor.phone).toEqual('555-1234');

    // Verify line items
    expect(result!.line_items).toHaveLength(2);
    
    const lineItem1 = result!.line_items.find(item => item.description === 'Product A');
    expect(lineItem1).toBeDefined();
    expect(lineItem1!.quantity).toEqual(2.000);
    expect(typeof lineItem1!.quantity).toBe('number');
    expect(lineItem1!.unit_price).toEqual(500.00);
    expect(typeof lineItem1!.unit_price).toBe('number');
    expect(lineItem1!.total_price).toEqual(1000.00);
    expect(typeof lineItem1!.total_price).toBe('number');

    const lineItem2 = result!.line_items.find(item => item.description === 'Product B');
    expect(lineItem2).toBeDefined();
    expect(lineItem2!.quantity).toEqual(1.000);
    expect(lineItem2!.unit_price).toEqual(500.00);
    expect(lineItem2!.total_price).toEqual(500.00);
  });

  it('should return invoice with vendor but no line items', async () => {
    // Create vendor
    const vendorResult = await db.insert(vendorsTable)
      .values(testVendor)
      .returning()
      .execute();
    const vendor = vendorResult[0];

    // Create invoice without line items
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        ...testInvoice,
        vendor_id: vendor.id
      })
      .returning()
      .execute();
    const invoice = invoiceResult[0];

    const input: GetInvoiceByIdInput = { id: invoice.id };
    const result = await getInvoiceById(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(invoice.id);
    expect(result!.vendor.id).toEqual(vendor.id);
    expect(result!.line_items).toHaveLength(0);
  });

  it('should return null for non-existent invoice', async () => {
    const input: GetInvoiceByIdInput = { id: 99999 };
    const result = await getInvoiceById(input);

    expect(result).toBeNull();
  });

  it('should handle nullable fields correctly', async () => {
    // Create vendor with minimal data
    const minimalVendor = {
      name: 'Minimal Vendor',
      address: null,
      email: null,
      phone: null
    };

    const vendorResult = await db.insert(vendorsTable)
      .values(minimalVendor)
      .returning()
      .execute();
    const vendor = vendorResult[0];

    // Create invoice with minimal data
    const minimalInvoice = {
      invoice_number: 'INV-MIN',
      vendor_id: vendor.id,
      invoice_date: new Date('2024-01-15'),
      due_date: null,
      total_amount: '100.00',
      status: 'pending' as const,
      file_path: null,
      original_filename: null
    };

    const invoiceResult = await db.insert(invoicesTable)
      .values(minimalInvoice)
      .returning()
      .execute();
    const invoice = invoiceResult[0];

    const input: GetInvoiceByIdInput = { id: invoice.id };
    const result = await getInvoiceById(input);

    expect(result).not.toBeNull();
    expect(result!.due_date).toBeNull();
    expect(result!.file_path).toBeNull();
    expect(result!.original_filename).toBeNull();
    expect(result!.vendor.address).toBeNull();
    expect(result!.vendor.email).toBeNull();
    expect(result!.vendor.phone).toBeNull();
  });
});
