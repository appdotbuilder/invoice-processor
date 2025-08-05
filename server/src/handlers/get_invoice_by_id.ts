
import { db } from '../db';
import { vendorsTable, invoicesTable, lineItemsTable } from '../db/schema';
import { type GetInvoiceByIdInput, type InvoiceWithDetails } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInvoiceById(input: GetInvoiceByIdInput): Promise<InvoiceWithDetails | null> {
  try {
    // Query invoice with vendor and line items
    const results = await db
      .select()
      .from(invoicesTable)
      .innerJoin(vendorsTable, eq(invoicesTable.vendor_id, vendorsTable.id))
      .leftJoin(lineItemsTable, eq(invoicesTable.id, lineItemsTable.invoice_id))
      .where(eq(invoicesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Group line items by invoice
    const invoiceData = results[0].invoices;
    const vendorData = results[0].vendors;
    
    // Extract and convert line items
    const lineItems = results
      .filter(result => result.line_items !== null)
      .map(result => ({
        ...result.line_items!,
        quantity: parseFloat(result.line_items!.quantity),
        unit_price: parseFloat(result.line_items!.unit_price),
        total_price: parseFloat(result.line_items!.total_price)
      }));

    // Build complete invoice object with numeric conversions
    return {
      ...invoiceData,
      total_amount: parseFloat(invoiceData.total_amount),
      vendor: vendorData,
      line_items: lineItems
    };
  } catch (error) {
    console.error('Get invoice by ID failed:', error);
    throw error;
  }
}
