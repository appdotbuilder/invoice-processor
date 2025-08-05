
import { db } from '../db';
import { invoicesTable, vendorsTable, lineItemsTable } from '../db/schema';
import { type UpdateInvoiceInput, type InvoiceWithDetails } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateInvoice(input: UpdateInvoiceInput): Promise<InvoiceWithDetails | null> {
  try {
    // Check if invoice exists
    const existingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    if (existingInvoice.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.invoice_number !== undefined) {
      updateData.invoice_number = input.invoice_number;
    }

    if (input.invoice_date !== undefined) {
      updateData.invoice_date = input.invoice_date;
    }

    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }

    if (input.total_amount !== undefined) {
      updateData.total_amount = input.total_amount.toString();
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update the invoice
    const updatedInvoices = await db.update(invoicesTable)
      .set(updateData)
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    const updatedInvoice = updatedInvoices[0];

    // Fetch the complete invoice with relations
    const invoiceWithDetails = await db.select()
      .from(invoicesTable)
      .innerJoin(vendorsTable, eq(invoicesTable.vendor_id, vendorsTable.id))
      .where(eq(invoicesTable.id, input.id))
      .execute();

    const invoiceData = invoiceWithDetails[0];

    // Get line items
    const lineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, input.id))
      .execute();

    // Convert numeric fields back to numbers
    return {
      id: invoiceData.invoices.id,
      invoice_number: invoiceData.invoices.invoice_number,
      vendor_id: invoiceData.invoices.vendor_id,
      invoice_date: invoiceData.invoices.invoice_date,
      due_date: invoiceData.invoices.due_date,
      total_amount: parseFloat(invoiceData.invoices.total_amount),
      status: invoiceData.invoices.status,
      file_path: invoiceData.invoices.file_path,
      original_filename: invoiceData.invoices.original_filename,
      created_at: invoiceData.invoices.created_at,
      updated_at: invoiceData.invoices.updated_at,
      vendor: {
        id: invoiceData.vendors.id,
        name: invoiceData.vendors.name,
        address: invoiceData.vendors.address,
        email: invoiceData.vendors.email,
        phone: invoiceData.vendors.phone,
        created_at: invoiceData.vendors.created_at
      },
      line_items: lineItems.map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        created_at: item.created_at
      }))
    };
  } catch (error) {
    console.error('Invoice update failed:', error);
    throw error;
  }
}
