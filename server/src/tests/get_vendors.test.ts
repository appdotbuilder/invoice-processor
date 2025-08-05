
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { vendorsTable } from '../db/schema';
import { type CreateVendorInput } from '../schema';
import { getVendors } from '../handlers/get_vendors';

const testVendor1: CreateVendorInput = {
  name: 'Zebra Corp',
  address: '123 Main St',
  email: 'contact@zebra.com',
  phone: '555-0123'
};

const testVendor2: CreateVendorInput = {
  name: 'Alpha Industries',
  address: '456 Oak Ave',
  email: 'info@alpha.com',
  phone: '555-0456'
};

const testVendor3: CreateVendorInput = {
  name: 'Beta Solutions',
  address: null,
  email: null,
  phone: null
};

describe('getVendors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no vendors exist', async () => {
    const result = await getVendors();

    expect(result).toEqual([]);
  });

  it('should return all vendors ordered by name alphabetically', async () => {
    // Create test vendors in random order
    await db.insert(vendorsTable).values([
      testVendor1, // Zebra Corp
      testVendor2, // Alpha Industries  
      testVendor3  // Beta Solutions
    ]).execute();

    const result = await getVendors();

    expect(result).toHaveLength(3);
    
    // Verify alphabetical ordering
    expect(result[0].name).toEqual('Alpha Industries');
    expect(result[1].name).toEqual('Beta Solutions');
    expect(result[2].name).toEqual('Zebra Corp');
  });

  it('should return vendors with all fields populated', async () => {
    await db.insert(vendorsTable).values(testVendor1).execute();

    const result = await getVendors();

    expect(result).toHaveLength(1);
    const vendor = result[0];
    
    expect(vendor.name).toEqual('Zebra Corp');
    expect(vendor.address).toEqual('123 Main St');
    expect(vendor.email).toEqual('contact@zebra.com');
    expect(vendor.phone).toEqual('555-0123');
    expect(vendor.id).toBeDefined();
    expect(vendor.created_at).toBeInstanceOf(Date);
  });

  it('should handle vendors with null optional fields', async () => {
    await db.insert(vendorsTable).values(testVendor3).execute();

    const result = await getVendors();

    expect(result).toHaveLength(1);
    const vendor = result[0];
    
    expect(vendor.name).toEqual('Beta Solutions');
    expect(vendor.address).toBeNull();
    expect(vendor.email).toBeNull();
    expect(vendor.phone).toBeNull();
    expect(vendor.id).toBeDefined();
    expect(vendor.created_at).toBeInstanceOf(Date);
  });
});
