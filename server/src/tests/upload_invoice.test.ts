
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type UploadInvoiceInput } from '../schema';
import { uploadInvoice } from '../handlers/upload_invoice';
import * as fs from 'fs';
import * as path from 'path';

// Test input with valid PDF
const testInput: UploadInvoiceInput = {
  filename: 'test_invoice.pdf',
  content_type: 'application/pdf',
  file_data: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNTMgMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE3OQolJUVPRgo=' // Base64 encoded minimal PDF
};

// Helper function to clean up test files
const cleanupTestFiles = async () => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
    if (fs.existsSync(uploadsDir)) {
      const files = await fs.promises.readdir(uploadsDir);
      for (const file of files) {
        if (file.includes('test')) {
          await fs.promises.unlink(path.join(uploadsDir, file));
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
};

describe('uploadInvoice', () => {
  beforeEach(createDB);
  afterEach(async () => {
    await resetDB();
    await cleanupTestFiles();
  });

  it('should upload a valid PDF file', async () => {
    const result = await uploadInvoice(testInput);

    expect(result.success).toBe(true);
    expect(result.file_path).toMatch(/^uploads\/invoices\/\d+_test_invoice\.pdf$/);

    // Verify file was actually created
    const fullPath = path.join(process.cwd(), result.file_path);
    expect(fs.existsSync(fullPath)).toBe(true);

    // Verify file content
    const savedContent = await fs.promises.readFile(fullPath);
    const originalContent = Buffer.from(testInput.file_data, 'base64');
    expect(savedContent.equals(originalContent)).toBe(true);
  });

  it('should upload a valid image file', async () => {
    const imageInput: UploadInvoiceInput = {
      filename: 'invoice_scan.jpg',
      content_type: 'image/jpeg',
      file_data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=' // Base64 encoded minimal JPEG
    };

    const result = await uploadInvoice(imageInput);

    expect(result.success).toBe(true);
    expect(result.file_path).toMatch(/^uploads\/invoices\/\d+_invoice_scan\.jpg$/);

    // Verify file exists
    const fullPath = path.join(process.cwd(), result.file_path);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('should reject unsupported file types', async () => {
    const invalidInput: UploadInvoiceInput = {
      filename: 'document.txt',
      content_type: 'text/plain',
      file_data: 'VGVzdCBkb2N1bWVudA==' // Base64 encoded "Test document"
    };

    expect(uploadInvoice(invalidInput)).rejects.toThrow(/unsupported file type/i);
  });

  it('should reject files exceeding size limit', async () => {
    // Create a large base64 string (over 10MB when decoded)
    const largeData = 'A'.repeat(15 * 1024 * 1024); // 15MB of 'A's
    const largeInput: UploadInvoiceInput = {
      filename: 'large_file.pdf',
      content_type: 'application/pdf',
      file_data: Buffer.from(largeData).toString('base64')
    };

    expect(uploadInvoice(largeInput)).rejects.toThrow(/file size exceeds 10mb limit/i);
  });

  it('should sanitize filenames with special characters', async () => {
    const specialInput: UploadInvoiceInput = {
      filename: 'invoice@#$%^&*()with spaces!.pdf',
      content_type: 'application/pdf',
      file_data: testInput.file_data
    };

    const result = await uploadInvoice(specialInput);

    expect(result.success).toBe(true);
    // More flexible regex to match the actual sanitized filename
    expect(result.file_path).toMatch(/^uploads\/invoices\/\d+_invoice_+with_spaces_\.pdf$/);

    // Verify file exists with sanitized name
    const fullPath = path.join(process.cwd(), result.file_path);
    expect(fs.existsSync(fullPath)).toBe(true);

    // Verify that special characters were replaced with underscores
    expect(result.file_path).toContain('invoice_');
    expect(result.file_path).toContain('with_spaces_');
    expect(result.file_path).not.toContain('@');
    expect(result.file_path).not.toContain('#');
    expect(result.file_path).not.toContain('$');
    expect(result.file_path).not.toContain('%');
    expect(result.file_path).not.toContain('!');
  });

  it('should create uploads directory if it does not exist', async () => {
    // Remove uploads directory if it exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      await fs.promises.rm(uploadsDir, { recursive: true, force: true });
    }

    const result = await uploadInvoice(testInput);

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'uploads', 'invoices'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), result.file_path))).toBe(true);
  });

  it('should handle PNG files correctly', async () => {
    const pngInput: UploadInvoiceInput = {
      filename: 'receipt.png',
      content_type: 'image/png',
      file_data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 transparent PNG
    };

    const result = await uploadInvoice(pngInput);

    expect(result.success).toBe(true);
    expect(result.file_path).toMatch(/^uploads\/invoices\/\d+_receipt\.png$/);

    const fullPath = path.join(process.cwd(), result.file_path);
    expect(fs.existsSync(fullPath)).toBe(true);
  });
});
