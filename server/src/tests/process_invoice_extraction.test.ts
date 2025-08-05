
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { processInvoiceExtraction } from '../handlers/process_invoice_extraction';
import { type CreateInvoiceInput } from '../schema';

const testFilePath = join(process.cwd(), 'test_invoice.json');

// Sample valid invoice data
const validInvoiceData = {
  invoice_number: 'INV-2024-001',
  vendor_name: 'Acme Corporation',
  vendor_address: '123 Business St, City, State 12345',
  vendor_email: 'billing@acme.com',
  vendor_phone: '+1-555-123-4567',
  invoice_date: '2024-01-15',
  due_date: '2024-02-15',
  total_amount: 1250.00,
  line_items: [
    {
      description: 'Professional Services',
      quantity: 10,
      unit_price: 100.00,
      total_price: 1000.00
    },
    {
      description: 'Materials',
      quantity: 5,
      unit_price: 50.00,
      total_price: 250.00
    }
  ]
};

describe('processInvoiceExtraction', () => {
  afterEach(() => {
    // Clean up test file
    if (existsSync(testFilePath)) {
      unlinkSync(testFilePath);
    }
  });

  it('should extract valid invoice data successfully', async () => {
    // Create test file with valid data
    writeFileSync(testFilePath, JSON.stringify(validInvoiceData, null, 2));

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).not.toBeNull();
    expect(result!.invoice_number).toBe('INV-2024-001');
    expect(result!.vendor.name).toBe('Acme Corporation');
    expect(result!.vendor.address).toBe('123 Business St, City, State 12345');
    expect(result!.vendor.email).toBe('billing@acme.com');
    expect(result!.vendor.phone).toBe('+1-555-123-4567');
    expect(result!.invoice_date).toEqual(new Date('2024-01-15'));
    expect(result!.due_date).toEqual(new Date('2024-02-15'));
    expect(result!.total_amount).toBe(1250.00);
    expect(result!.status).toBe('pending');
    expect(result!.file_path).toBe(testFilePath);
    expect(result!.original_filename).toBe('test_invoice.json');
    expect(result!.line_items).toHaveLength(2);
    expect(result!.line_items[0].description).toBe('Professional Services');
    expect(result!.line_items[0].quantity).toBe(10);
    expect(result!.line_items[0].unit_price).toBe(100.00);
    expect(result!.line_items[0].total_price).toBe(1000.00);
  });

  it('should handle minimal valid data', async () => {
    const minimalData = {
      invoice_number: 'MIN-001',
      vendor_name: 'Basic Vendor',
      invoice_date: '2024-01-15',
      total_amount: 500.00,
      line_items: [
        {
          description: 'Service',
          quantity: 1,
          unit_price: 500.00,
          total_price: 500.00
        }
      ]
    };

    writeFileSync(testFilePath, JSON.stringify(minimalData, null, 2));

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).not.toBeNull();
    expect(result!.invoice_number).toBe('MIN-001');
    expect(result!.vendor.name).toBe('Basic Vendor');
    expect(result!.vendor.address).toBeNull();
    expect(result!.vendor.email).toBeNull();
    expect(result!.vendor.phone).toBeNull();
    expect(result!.due_date).toBeNull();
    expect(result!.total_amount).toBe(500.00);
    expect(result!.line_items).toHaveLength(1);
  });

  it('should return null for missing required fields', async () => {
    const invalidData = {
      vendor_name: 'Test Vendor',
      invoice_date: '2024-01-15',
      // Missing invoice_number, total_amount, line_items
    };

    writeFileSync(testFilePath, JSON.stringify(invalidData, null, 2));

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).toBeNull();
  });

  it('should return null for empty line items', async () => {
    const dataWithEmptyLineItems = {
      invoice_number: 'INV-001',
      vendor_name: 'Test Vendor',
      invoice_date: '2024-01-15',
      total_amount: 100.00,
      line_items: []
    };

    writeFileSync(testFilePath, JSON.stringify(dataWithEmptyLineItems, null, 2));

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).toBeNull();
  });

  it('should return null for invalid line item data', async () => {
    const dataWithInvalidLineItems = {
      invoice_number: 'INV-001',
      vendor_name: 'Test Vendor',
      invoice_date: '2024-01-15',
      total_amount: 100.00,
      line_items: [
        {
          description: 'Valid Item',
          quantity: 1,
          unit_price: 50.00,
          total_price: 50.00
        },
        {
          description: '', // Invalid: empty description
          quantity: 0, // Invalid: zero quantity
          unit_price: -10.00, // Invalid: negative price
          total_price: 0
        }
      ]
    };

    writeFileSync(testFilePath, JSON.stringify(dataWithInvalidLineItems, null, 2));

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).toBeNull();
  });

  it('should return null for invalid date format', async () => {
    const dataWithInvalidDate = {
      ...validInvoiceData,
      invoice_date: 'invalid-date'
    };

    writeFileSync(testFilePath, JSON.stringify(dataWithInvalidDate, null, 2));

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).toBeNull();
  });

  it('should handle invalid due date gracefully', async () => {
    const dataWithInvalidDueDate = {
      ...validInvoiceData,
      due_date: 'invalid-date'
    };

    writeFileSync(testFilePath, JSON.stringify(dataWithInvalidDueDate, null, 2));

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).not.toBeNull();
    expect(result!.due_date).toBeNull();
  });

  it('should return null for non-JSON file content', async () => {
    writeFileSync(testFilePath, 'This is not JSON content');

    const result = await processInvoiceExtraction(testFilePath);

    expect(result).toBeNull();
  });

  it('should return null for non-existent file', async () => {
    const result = await processInvoiceExtraction('/non/existent/file.json');

    expect(result).toBeNull();
  });
});
