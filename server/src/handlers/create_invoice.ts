
import { db } from '../db';
import { vendorsTable, invoicesTable, lineItemsTable } from '../db/schema';
import { type CreateInvoiceInput, type InvoiceWithDetails } from '../schema';
import { eq, or } from 'drizzle-orm';

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  try {
    // Step 1: Create or find existing vendor by name and email
    let vendor;
    const existingVendors = await db.select()
      .from(vendorsTable)
      .where(
        or(
          eq(vendorsTable.name, input.vendor.name),
          input.vendor.email ? eq(vendorsTable.email, input.vendor.email) : undefined
        )
      )
      .execute();

    if (existingVendors.length > 0) {
      vendor = existingVendors[0];
    } else {
      // Create new vendor
      const vendorResult = await db.insert(vendorsTable)
        .values({
          name: input.vendor.name,
          address: input.vendor.address || null,
          email: input.vendor.email || null,
          phone: input.vendor.phone || null
        })
        .returning()
        .execute();
      
      vendor = vendorResult[0];
    }

    // Step 2: Create invoice record with vendor relationship
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        invoice_number: input.invoice_number,
        vendor_id: vendor.id,
        invoice_date: input.invoice_date,
        due_date: input.due_date || null,
        total_amount: input.total_amount.toString(),
        status: input.status || 'pending',
        file_path: input.file_path || null,
        original_filename: input.original_filename || null
      })
      .returning()
      .execute();

    const invoice = invoiceResult[0];

    // Step 3: Create all line items for the invoice
    const lineItemsData = input.line_items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      total_price: item.total_price.toString()
    }));

    const lineItemsResult = await db.insert(lineItemsTable)
      .values(lineItemsData)
      .returning()
      .execute();

    // Step 4: Return complete invoice with vendor and line items populated
    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount),
      vendor: vendor,
      line_items: lineItemsResult.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price)
      }))
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
}
