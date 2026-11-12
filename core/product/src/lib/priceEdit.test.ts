import { describe, expect, it } from 'vitest';
import type { ShopProductSearchAccess } from '@inventory-platform/access';
import type { InventoryItem } from '@inventory-platform/product/types';
import {
  buildPriceUpdate,
  buildRatesUpdate,
  canEditAnyPriceField,
  priceDraftFrom,
} from './priceEdit';

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
});

describe('buildRatesUpdate', () => {
  const ruleRate = {
    name: 'WHOLESALE',
    price: 90,
    base: 'priceToRetail',
    baseValue: 100,
    discountPercent: 10,
    scheme: null,
  } as const;
  const saved = { rates: [{ name: 'RATE-A', price: 70 }, ruleRate], defaultRate: 'priceToRetail' };
  const allowed = ['priceToRetail', 'maximumRetailPrice', 'costPrice', 'RATE-A', 'WHOLESALE'];
  const untouched = { rates: saved.rates, defaultRate: saved.defaultRate, resetNames: [] };

  it('makes no pricing write when nothing changed', () => {
    expect(buildRatesUpdate(saved, untouched, allowed)).toEqual({ payload: null, errors: [] });
  });

  it('sends the full list when a hand-typed rate changes, a rule rate as it is', () => {
    const draft = {
      ...untouched,
      rates: [{ name: ' RATE-A ', price: 72 }, ruleRate, { name: '', price: 0 }],
    };

    expect(buildRatesUpdate(saved, draft, allowed)).toEqual({
      payload: { rates: [{ name: 'RATE-A', price: 72 }, ruleRate] },
      errors: [],
    });
  });

  it("sends the list when only a rule rate's terms change", () => {
    const edited = { ...ruleRate, discountPercent: 12 };
    const draft = { ...untouched, rates: [saved.rates[0], edited] };

    expect(buildRatesUpdate(saved, draft, allowed).payload).toEqual({
      rates: [saved.rates[0], edited],
    });
  });

  it('sends resets and a changed default rate on their own', () => {
    const draft = { ...untouched, defaultRate: 'WHOLESALE', resetNames: ['WHOLESALE'] };

    expect(buildRatesUpdate(saved, draft, allowed).payload).toEqual({
      defaultRate: 'WHOLESALE',
      resetRates: ['WHOLESALE'],
    });
  });

  it('refuses a default rate the server does not offer, and a negative price', () => {
    const draft = {
      ...untouched,
      rates: [{ name: 'RATE-A', price: -1 }, ruleRate],
      defaultRate: 'RATE-NEW',
    };

    expect(buildRatesUpdate(saved, draft, allowed).errors).toEqual([
      'Each rate needs a price of 0 or more',
      'Choose a default rate from the list',
    ]);
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
