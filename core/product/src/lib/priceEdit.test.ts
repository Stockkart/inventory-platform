import { describe, expect, it } from 'vitest';
import type { ShopProductSearchAccess } from '@inventory-platform/access';
import type { InventoryItem } from '@inventory-platform/product/types';
import { buildPriceUpdate, canEditAnyPriceField, priceDraftFrom } from './priceEdit';

const lot = {
  id: 'lot-1',
  priceToRetail: 67.8,
  maximumRetailPrice: 89,
  costPrice: 67.8,
  sgst: '2.5',
  cgst: '2.5',
  saleAdditionalDiscount: 3,
  rates: [{ name: 'RATE-A', price: 70 }],
  defaultRate: 'priceToRetail',
} as unknown as InventoryItem;

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

describe('buildPriceUpdate', () => {
  it('sends nothing when nothing changed', () => {
    expect(buildPriceUpdate(lot, priceDraftFrom(lot))).toEqual({ payload: {}, errors: [] });
  });

  it('sends only the changed prices', () => {
    const draft = { ...priceDraftFrom(lot), priceToRetail: '77.5', sgst: '6', cgst: '6' };

    expect(buildPriceUpdate(lot, draft)).toEqual({
      payload: { priceToRetail: 77.5, sgst: '6', cgst: '6' },
      errors: [],
    });
  });

  it('clears an emptied sale add. discount, and refuses an emptied price', () => {
    const draft = { ...priceDraftFrom(lot), saleAdditionalDiscount: '', maximumRetailPrice: '' };

    expect(buildPriceUpdate(lot, draft)).toEqual({
      payload: { clearFields: ['saleAdditionalDiscount'] },
      errors: ['MRP cannot be empty'],
    });
  });

  it('refuses a negative or non-numeric price', () => {
    const draft = { ...priceDraftFrom(lot), costPrice: '-1', priceToRetail: 'abc' };

    expect(buildPriceUpdate(lot, draft).errors).toEqual([
      'PTR must be a number of 0 or more',
      'PTS must be a number of 0 or more',
    ]);
  });

  it('sends the rate list and default rate when they change', () => {
    const draft = {
      ...priceDraftFrom(lot),
      rates: [
        { name: 'RATE-A', price: 70 },
        { name: ' RATE-B ', price: 72 },
        { name: '', price: 0 },
      ],
      defaultRate: 'RATE-B',
    };

    expect(buildPriceUpdate(lot, draft).payload).toEqual({
      rates: [
        { name: 'RATE-A', price: 70 },
        { name: 'RATE-B', price: 72 },
      ],
      defaultRate: 'RATE-B',
    });
  });
});

describe('canEditAnyPriceField', () => {
  it('is true for full edit and for a member granted one price', () => {
    expect(canEditAnyPriceField(access({ editMode: 'FULL_EDIT' }))).toBe(true);
    expect(canEditAnyPriceField(access({ editableFields: ['maximumRetailPrice'] }))).toBe(true);
  });

  it('is false for a member with no price grant or no edit access', () => {
    expect(canEditAnyPriceField(access({ editableFields: ['name', 'location'] }))).toBe(false);
    expect(canEditAnyPriceField(access({ editMode: 'FULL_EDIT', canEdit: false }))).toBe(false);
  });
});
