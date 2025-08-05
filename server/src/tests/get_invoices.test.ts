
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable, invoicesTable, lineItemsTable } from '../db/schema';
import { type GetInvoicesQuery } from '../schema';
import { getInvoices } from '../handlers/get_invoices';

describe('getInvoices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no invoices exist', async () => {
    const query: GetInvoicesQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getInvoices(query);
    expect(result).toEqual([]);
  });

  it('should fetch invoices with vendor and line items', async () => {
    // Create test vendor
    const vendorResult = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St',
        email: 'test@vendor.com',
        phone: '555-0123'
      })
      .returning()
      .execute();
    
    const vendor = vendorResult[0];

    // Create test invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-001',
        vendor_id: vendor.id,
        invoice_date: new Date('2024-01-15'),
        due_date: new Date('2024-02-15'),
        total_amount: '150.00',
        status: 'pending'
      })
      .returning()
      .execute();

    const invoice = invoiceResult[0];

    // Create test line items
    await db.insert(lineItemsTable)
      .values([
        {
          invoice_id: invoice.id,
          description: 'Item 1',
          quantity: '2.000',
          unit_price: '50.00',
          total_price: '100.00'
        },
        {
          invoice_id: invoice.id,
          description: 'Item 2',
          quantity: '1.000',
          unit_price: '50.00',
          total_price: '50.00'
        }
      ])
      .execute();

    const query: GetInvoicesQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getInvoices(query);

    expect(result).toHaveLength(1);
    
    const fetchedInvoice = result[0];
    expect(fetchedInvoice.id).toEqual(invoice.id);
    expect(fetchedInvoice.invoice_number).toEqual('INV-001');
    expect(fetchedInvoice.vendor_id).toEqual(vendor.id);
    expect(fetchedInvoice.total_amount).toEqual(150.00);
    expect(typeof fetchedInvoice.total_amount).toBe('number');
    expect(fetchedInvoice.status).toEqual('pending');

    // Check vendor details
    expect(fetchedInvoice.vendor.id).toEqual(vendor.id);
    expect(fetchedInvoice.vendor.name).toEqual('Test Vendor');
    expect(fetchedInvoice.vendor.email).toEqual('test@vendor.com');

    // Check line items
    expect(fetchedInvoice.line_items).toHaveLength(2);
    expect(fetchedInvoice.line_items[0].description).toEqual('Item 1');
    expect(fetchedInvoice.line_items[0].quantity).toEqual(2);
    expect(typeof fetchedInvoice.line_items[0].quantity).toBe('number');
    expect(fetchedInvoice.line_items[0].unit_price).toEqual(50);
    expect(typeof fetchedInvoice.line_items[0].unit_price).toBe('number');
    expect(fetchedInvoice.line_items[0].total_price).toEqual(100);
    expect(typeof fetchedInvoice.line_items[0].total_price).toBe('number');
  });

  it('should filter by status', async () => {
    // Create vendor
    const vendorResult = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St'
      })
      .returning()
      .execute();
    
    const vendor = vendorResult[0];

    // Create invoices with different statuses
    await db.insert(invoicesTable)
      .values([
        {
          invoice_number: 'INV-001',
          vendor_id: vendor.id,
          invoice_date: new Date('2024-01-15'),
          total_amount: '100.00',
          status: 'pending'
        },
        {
          invoice_number: 'INV-002',
          vendor_id: vendor.id,
          invoice_date: new Date('2024-01-16'),
          total_amount: '200.00',
          status: 'paid'
        }
      ])
      .execute();

    const query: GetInvoicesQuery = {
      status: 'pending',
      limit: 50,
      offset: 0
    };

    const result = await getInvoices(query);

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-001');
    expect(result[0].status).toEqual('pending');
  });

  it('should filter by vendor_id', async () => {
    // Create two vendors
    const vendor1Result = await db.insert(vendorsTable)
      .values({
        name: 'Vendor 1',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const vendor2Result = await db.insert(vendorsTable)
      .values({
        name: 'Vendor 2',
        address: '456 Test Ave'
      })
      .returning()
      .execute();
    
    const vendor1 = vendor1Result[0];
    const vendor2 = vendor2Result[0];

    // Create invoices for both vendors
    await db.insert(invoicesTable)
      .values([
        {
          invoice_number: 'INV-001',
          vendor_id: vendor1.id,
          invoice_date: new Date('2024-01-15'),
          total_amount: '100.00',
          status: 'pending'
        },
        {
          invoice_number: 'INV-002',
          vendor_id: vendor2.id,
          invoice_date: new Date('2024-01-16'),
          total_amount: '200.00',
          status: 'pending'
        }
      ])
      .execute();

    const query: GetInvoicesQuery = {
      vendor_id: vendor1.id,
      limit: 50,
      offset: 0
    };

    const result = await getInvoices(query);

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-001');
    expect(result[0].vendor_id).toEqual(vendor1.id);
    expect(result[0].vendor.name).toEqual('Vendor 1');
  });

  it('should apply pagination correctly', async () => {
    // Create vendor
    const vendorResult = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St'
      })
      .returning()
      .execute();
    
    const vendor = vendorResult[0];

    // Create multiple invoices
    await db.insert(invoicesTable)
      .values([
        {
          invoice_number: 'INV-001',
          vendor_id: vendor.id,
          invoice_date: new Date('2024-01-15'),
          total_amount: '100.00',
          status: 'pending'
        },
        {
          invoice_number: 'INV-002',
          vendor_id: vendor.id,
          invoice_date: new Date('2024-01-16'),
          total_amount: '200.00',
          status: 'pending'
        },
        {
          invoice_number: 'INV-003',
          vendor_id: vendor.id,
          invoice_date: new Date('2024-01-17'),
          total_amount: '300.00',
          status: 'pending'
        }
      ])
      .execute();

    // Test first page
    const firstPageQuery: GetInvoicesQuery = {
      limit: 2,
      offset: 0
    };

    const firstPage = await getInvoices(firstPageQuery);
    expect(firstPage).toHaveLength(2);

    // Test second page
    const secondPageQuery: GetInvoicesQuery = {
      limit: 2,
      offset: 2
    };

    const secondPage = await getInvoices(secondPageQuery);
    expect(secondPage).toHaveLength(1);
  });

  it('should handle combined filters', async () => {
    // Create vendor
    const vendorResult = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St'
      })
      .returning()
      .execute();
    
    const vendor = vendorResult[0];

    // Create invoices with different statuses
    await db.insert(invoicesTable)
      .values([
        {
          invoice_number: 'INV-001',
          vendor_id: vendor.id,
          invoice_date: new Date('2024-01-15'),
          total_amount: '100.00',
          status: 'pending'
        },
        {
          invoice_number: 'INV-002',
          vendor_id: vendor.id,
          invoice_date: new Date('2024-01-16'),
          total_amount: '200.00',
          status: 'paid'
        }
      ])
      .execute();

    const query: GetInvoicesQuery = {
      status: 'paid',
      vendor_id: vendor.id,
      limit: 50,
      offset: 0
    };

    const result = await getInvoices(query);

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-002');
    expect(result[0].status).toEqual('paid');
    expect(result[0].vendor_id).toEqual(vendor.id);
  });

  it('should handle invoices without line items', async () => {
    // Create vendor
    const vendorResult = await db.insert(vendorsTable)
      .values({
        name: 'Test Vendor',
        address: '123 Test St'
      })
      .returning()
      .execute();
    
    const vendor = vendorResult[0];

    // Create invoice without line items
    await db.insert(invoicesTable)
      .values({
        invoice_number: 'INV-001',
        vendor_id: vendor.id,
        invoice_date: new Date('2024-01-15'),
        total_amount: '100.00',
        status: 'pending'
      })
      .execute();

    const query: GetInvoicesQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getInvoices(query);

    expect(result).toHaveLength(1);
    expect(result[0].invoice_number).toEqual('INV-001');
    expect(result[0].line_items).toEqual([]);
  });
});
