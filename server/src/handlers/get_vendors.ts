
import { db } from '../db';
import { vendorsTable } from '../db/schema';
import { type Vendor } from '../schema';
import { asc } from 'drizzle-orm';

export async function getVendors(): Promise<Vendor[]> {
  try {
    const results = await db.select()
      .from(vendorsTable)
      .orderBy(asc(vendorsTable.name))
      .execute();

    return results;
  } catch (error) {
    console.error('Get vendors failed:', error);
    throw error;
  }
}
