
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type GetInvoiceByIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteInvoice(input: GetInvoiceByIdInput): Promise<{ success: boolean; deleted_id: number | null }> {
  try {
    // Check if invoice exists first
    const existingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    if (existingInvoice.length === 0) {
      return {
        success: false,
        deleted_id: null
      };
    }

    // Delete the invoice (line items will be deleted automatically due to cascade)
    const result = await db.delete(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .returning({ id: invoicesTable.id })
      .execute();

    return {
      success: result.length > 0,
      deleted_id: result.length > 0 ? result[0].id : null
    };
  } catch (error) {
    console.error('Invoice deletion failed:', error);
    throw error;
  }
}
