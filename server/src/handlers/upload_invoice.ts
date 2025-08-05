
import * as fs from 'fs';
import * as path from 'path';
import { type UploadInvoiceInput } from '../schema';

export async function uploadInvoice(input: UploadInvoiceInput): Promise<{ file_path: string; success: boolean }> {
  try {
    // Validate file type based on content type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif'
    ];
    
    if (!allowedTypes.includes(input.content_type.toLowerCase())) {
      throw new Error(`Unsupported file type: ${input.content_type}. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Decode base64 file data
    const fileBuffer = Buffer.from(input.file_data, 'base64');
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (fileBuffer.length > maxSize) {
      throw new Error(`File size exceeds 10MB limit. Current size: ${Math.round(fileBuffer.length / 1024 / 1024)}MB`);
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = getFileExtension(input.content_type);
    const sanitizedFilename = sanitizeFilename(input.filename);
    const uniqueFilename = `${timestamp}_${sanitizedFilename}${fileExtension}`;
    const relativePath = `uploads/invoices/${uniqueFilename}`;
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    
    // Save file to storage
    const fullPath = path.join(uploadsDir, uniqueFilename);
    await fs.promises.writeFile(fullPath, fileBuffer);
    
    return {
      file_path: relativePath,
      success: true
    };
  } catch (error) {
    console.error('Invoice upload failed:', error);
    throw error;
  }
}

function getFileExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif'
  };
  
  return extensions[contentType.toLowerCase()] || '';
}

function sanitizeFilename(filename: string): string {
  // Remove file extension and sanitize
  const nameWithoutExt = path.parse(filename).name;
  return nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100); // Limit length
}
