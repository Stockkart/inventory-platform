import { describe, expect, it } from 'vitest';
import type { ShopProductSearchAccess } from '@inventory-platform/access';
import { splitUpdateByAccess } from './productEditPermissions';

const CORE = [
  'name',
  'description',
  'companyName',
  'count',
  'location',
  'batchNo',
  'expiryDate',
  'costPrice',
  'priceToRetail',
  'maximumRetailPrice',
  'sellingPrice',
  'hsn',
  'cgst',
  'sgst',
  'barcode',
  'baseUnit',
  'unitsPerPack',
];

function access(overrides: Partial<ShopProductSearchAccess>): ShopProductSearchAccess {
  return {
    canView: true,
    canEdit: true,
    editMode: 'PERMISSION_BASED',
    canEditAll: false,
    editableFields: [],
    ...overrides,
  };
}

describe('splitUpdateByAccess', () => {
  it('lets the owner (FULL_EDIT) send schemes, discounts and the rest', () => {
    const payload = {
      purchaseSchemeType: 'FIXED_UNITS' as const,
      purchaseSchemePayFor: 19,
      purchaseSchemeFree: 1,
      purchaseAdditionalDiscount: 9,
      saleAdditionalDiscount: 3,
      thresholdCount: 5,
      itemType: 'COSTLY' as const,
      discountApplicable: 'DISCOUNT' as const,
      purchaseDate: '2025-01-31T00:00:00Z',
    };

    const { allowed, refused } = splitUpdateByAccess(
      payload,
      access({ editMode: 'FULL_EDIT', canEditAll: true, editableFields: CORE }),
    );

    expect(allowed).toEqual(payload);
    expect(refused).toEqual([]);
  });

  it('refuses non-core fields for a member who holds every core field', () => {
    const { allowed, refused } = splitUpdateByAccess(
      { maximumRetailPrice: 99.5, saleAdditionalDiscount: 3 },
      access({ canEditAll: true, editableFields: CORE }),
    );

    expect(allowed).toEqual({ maximumRetailPrice: 99.5 });
    expect(refused).toEqual(['saleAdditionalDiscount']);
  });

  it('checks packaging and vertical fields under the keys the API uses', () => {
    const { allowed, refused } = splitUpdateByAccess(
      {
        unitConversions: { unit: 'STRIP', factor: 10 },
        verticalFields: { batchNo: 'B1', expiryDate: '2028-03-31T00:00:00Z' },
      },
      access({ editableFields: ['unitsPerPack', 'batchNo'] }),
    );

    expect(allowed).toEqual({ unitConversions: { unit: 'STRIP', factor: 10 } });
    expect(refused).toEqual(['expiryDate']);
  });

  it('checks a clear under the grant for setting the field', () => {
    const member = access({ editableFields: ['location'] });

    expect(splitUpdateByAccess({ clearFields: ['location'] }, member).refused).toEqual([]);
    expect(splitUpdateByAccess({ clearFields: ['location', 'saleScheme'] }, member)).toEqual({
      allowed: {},
      refused: ['schemeType'],
    });
    expect(
      splitUpdateByAccess(
        { clearFields: ['purchaseScheme', 'saleAdditionalDiscount'] },
        access({ editMode: 'FULL_EDIT' }),
      ).refused,
    ).toEqual([]);
  });

  it('sends everything when access has not loaded', () => {
    const { allowed, refused } = splitUpdateByAccess({ thresholdCount: 5 }, null);

    expect(allowed).toEqual({ thresholdCount: 5 });
    expect(refused).toEqual([]);
  });
});
