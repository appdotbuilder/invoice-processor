
import { db } from '../db';
import { invoicesTable, vendorsTable, lineItemsTable } from '../db/schema';
import { type GetInvoicesQuery, type InvoiceWithDetails } from '../schema';
import { eq, and, inArray, type SQL } from 'drizzle-orm';

export async function getInvoices(query: GetInvoicesQuery): Promise<InvoiceWithDetails[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query.status) {
      conditions.push(eq(invoicesTable.status, query.status));
    }

    if (query.vendor_id) {
      conditions.push(eq(invoicesTable.vendor_id, query.vendor_id));
    }

    // Build the complete query in a single chain
    const baseQuery = db.select()
      .from(invoicesTable)
      .innerJoin(vendorsTable, eq(invoicesTable.vendor_id, vendorsTable.id));

    // Execute the query with all modifiers in one chain
    const invoiceResults = conditions.length > 0
      ? await baseQuery
          .where(and(...conditions))
          .limit(query.limit)
          .offset(query.offset)
          .execute()
      : await baseQuery
          .limit(query.limit)
          .offset(query.offset)
          .execute();

    // If no invoices found, return empty array
    if (invoiceResults.length === 0) {
      return [];
    }

    // Get invoice IDs for line items query
    const invoiceIds = invoiceResults.map(result => result.invoices.id);

    // Fetch all line items for these invoices
    const lineItemsResults = await db.select()
      .from(lineItemsTable)
      .where(inArray(lineItemsTable.invoice_id, invoiceIds))
      .execute();

    // Group line items by invoice_id
    const lineItemsByInvoice = lineItemsResults.reduce((acc, item) => {
      if (!acc[item.invoice_id]) {
        acc[item.invoice_id] = [];
      }
      acc[item.invoice_id].push({
        ...item,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price)
      });
      return acc;
    }, {} as Record<number, any[]>);

    // Transform results to match InvoiceWithDetails schema
    return invoiceResults.map(result => ({
      id: result.invoices.id,
      invoice_number: result.invoices.invoice_number,
      vendor_id: result.invoices.vendor_id,
      invoice_date: result.invoices.invoice_date,
      due_date: result.invoices.due_date,
      total_amount: parseFloat(result.invoices.total_amount),
      status: result.invoices.status,
      file_path: result.invoices.file_path,
      original_filename: result.invoices.original_filename,
      created_at: result.invoices.created_at,
      updated_at: result.invoices.updated_at,
      vendor: {
        id: result.vendors.id,
        name: result.vendors.name,
        address: result.vendors.address,
        email: result.vendors.email,
        phone: result.vendors.phone,
        created_at: result.vendors.created_at
      },
      line_items: lineItemsByInvoice[result.invoices.id] || []
    }));
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    throw error;
  }
}
