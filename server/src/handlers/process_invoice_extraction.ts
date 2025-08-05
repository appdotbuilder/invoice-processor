
import { type CreateInvoiceInput } from '../schema';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock OCR/AI service response structure
interface ExtractedInvoiceData {
  invoice_number: string;
  vendor_name: string;
  vendor_address?: string;
  vendor_email?: string;
  vendor_phone?: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

// Simulate OCR/AI extraction service
function simulateOCRExtraction(fileContent: string): ExtractedInvoiceData | null {
  try {
    // In a real implementation, this would call an OCR/AI service
    // For testing purposes, we'll look for JSON data in the file
    const data = JSON.parse(fileContent);
    
    // Validate required fields are present
    if (!data.invoice_number || !data.vendor_name || !data.invoice_date || 
        !data.total_amount || !data.line_items || !Array.isArray(data.line_items)) {
      return null;
    }

    return data as ExtractedInvoiceData;
  } catch (error) {
    // In a real implementation, this would use OCR to extract text
    // and then use AI/ML to parse the text into structured data
    console.error('OCR extraction failed:', error);
    return null;
  }
}

export async function processInvoiceExtraction(file_path: string): Promise<CreateInvoiceInput | null> {
  try {
    // Read the file content
    const fileContent = readFileSync(file_path, 'utf-8');
    
    // Extract data using OCR/AI service (simulated)
    const extractedData = simulateOCRExtraction(fileContent);
    
    if (!extractedData) {
      return null;
    }

    // Validate line items
    if (extractedData.line_items.length === 0) {
      return null;
    }

    // Validate each line item has required fields
    for (const item of extractedData.line_items) {
      if (!item.description || item.quantity <= 0 || item.unit_price <= 0 || item.total_price <= 0) {
        return null;
      }
    }

    // Parse dates
    const invoice_date = new Date(extractedData.invoice_date);
    if (isNaN(invoice_date.getTime())) {
      return null;
    }

    let due_date: Date | null = null;
    if (extractedData.due_date) {
      due_date = new Date(extractedData.due_date);
      if (isNaN(due_date.getTime())) {
        due_date = null;
      }
    }

    // Structure the data according to CreateInvoiceInput schema
    const result: CreateInvoiceInput = {
      invoice_number: extractedData.invoice_number,
      vendor: {
        name: extractedData.vendor_name,
        address: extractedData.vendor_address || null,
        email: extractedData.vendor_email || null,
        phone: extractedData.vendor_phone || null
      },
      invoice_date,
      due_date,
      total_amount: extractedData.total_amount,
      status: 'pending',
      file_path,
      original_filename: file_path.split('/').pop() || null,
      line_items: extractedData.line_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }))
    };

    return result;
  } catch (error) {
    console.error('Invoice extraction failed:', error);
    return null;
  }
}
