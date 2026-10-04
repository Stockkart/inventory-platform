// Feature: configurable-product-card, Property 12: Default parity (example-based)
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { InventoryItem } from '../../model/types';
import type { ResolvedCardLayout } from '../../model/cardLayout.types';
import { FALLBACK_CARD_LAYOUTS } from '../../cardLayout/cardLayoutDefaults';
import { hideSensitivePolicy, type FieldVisibilityPolicy } from '../../cardLayout/fieldVisibility';
import { CardLayoutBody } from './CardLayoutBody';

/**
 * Visible line sequences captured from the pre-feature `ProductSearchCard`, `SearchDropdownItem`
 * and `IngredientSearchCard` bodies for the fixtures below, with dates normalised to `d MMM yyyy`
 * (the one deliberate change, Req 6.4). `|` marks a divider, `#` a chip row, `>` the description.
 */

const medical: InventoryItem = item({
  name: 'Testing the maal',
  companyName: 'CHARAK PC',
  barcode: 'SKA79BMEZWB04Y',
  location: 'J2',
  availableCount: 10,
  currentCount: 10,
  receivedCount: 10,
  soldCount: 0,
  sellingPrice: 120,
  priceToRetail: 110,
  maximumRetailPrice: 200,
  saleAdditionalDiscount: 5,
  purchaseDate: '2026-09-29T10:00:00Z',
  verticalFields: { batchNo: 'TMT0151', expiryDate: '2028-01-08T00:00:00Z' },
  billingMode: 'REGULAR',
});

const sportsBasic: InventoryItem = item({
  name: 'Base sale unit maal',
  companyName: 'Testing product',
  barcode: '646533345',
  location: '542',
  currentCount: 9.2,
  receivedCount: 10,
  soldCount: 0.8,
  priceToRetail: 120,
  maximumRetailPrice: 150,
  createdAt: '2026-10-03T08:00:00Z',
  expiryDate: '2026-05-10T00:00:00Z',
  itemType: 'COSTLY',
  discountApplicable: 'SCHEME',
  scheme: 2,
  description: 'Sold per base unit',
  billingMode: 'BASIC',
  verticalFields: { brand: 'Acme' },
});

const zeroStock: InventoryItem = item({
  name: 'Empty lot',
  companyName: null,
  barcode: null,
  location: '',
  currentCount: 0,
  receivedCount: 5,
  soldCount: 5,
  priceToRetail: 0,
  maximumRetailPrice: 0,
});

describe('CardLayoutBody default parity — product-search (Req 6.1, 6.4)', () => {
  const layout = FALLBACK_CARD_LAYOUTS['product-search'].REGULAR;

  it('medical lot with batch, expiry and discount', () => {
    expect(lines(medical, layout)).toEqual([
      'Company: CHARAK PC',
      'Batch: TMT0151',
      'Barcode: SKA79BMEZWB04Y',
      'Location: J2',
      '|',
      'Available: 10',
      'Received: 10 | Sold: 0',
      '*Selling Price: ₹120.00',
      '*MRP: ₹200.00',
      '*Additional Discount: 5.00%',
      'Expires: 8 Jan 2028',
      'Purchased: 29 Sep 2026',
    ]);
  });

  it('basic lot without batch falls back to PTR, created date and shows chips + description', () => {
    expect(lines(sportsBasic, layout)).toEqual([
      'Company: Testing product',
      'Barcode: 646533345',
      'Location: 542',
      '|',
      'Available: 9.2',
      'Received: 10 | Sold: 0.8',
      '*Selling Price: ₹120.00',
      '*MRP: ₹150.00',
      'Expires: 10 May 2026',
      'Purchased: 3 Oct 2026',
      '#Costly',
      '#Scheme',
      '#2 free',
      '>Sold per base unit',
    ]);
  });

  it('zero-stock lot with blanks hides empty lines and keeps zero values', () => {
    expect(lines(zeroStock, layout)).toEqual([
      '|',
      'Available: 0',
      'Received: 5 | Sold: 5',
      '*Selling Price: ₹0.00',
      '*MRP: ₹0.00',
    ]);
  });

  it('SHOW_DASH prints a dash for every blank so cards align', () => {
    const dashed: ResolvedCardLayout = {
      ...layout,
      options: { ...layout.options, blankValueBehavior: 'SHOW_DASH' },
    };
    expect(lines(zeroStock, dashed)).toEqual([
      'Company: —',
      'Batch: —',
      'Barcode: —',
      'Location: —',
      '|',
      'Available: 0',
      'Received: 5 | Sold: 5',
      '*Selling Price: ₹0.00',
      '*MRP: ₹0.00',
      '*Additional Discount: —',
      'Expires: —',
      'Purchased: —',
    ]);
  });
});

describe('CardLayoutBody default parity — scan-sell compact (Req 6.2)', () => {
  const layout = FALLBACK_CARD_LAYOUTS['scan-sell'].REGULAR;

  it('matches the dropdown row lines', () => {
    expect(lines(medical, layout, 'compact')).toEqual([
      'Company: CHARAK PC',
      'Batch: TMT0151',
      'Barcode: SKA79BMEZWB04Y',
      'Available: 10',
      '*MRP: ₹200.00',
      '*Selling: ₹120.00',
      '*Expires: 8 Jan 2028',
    ]);
  });

  it('never shows chips or description', () => {
    expect(lines(sportsBasic, layout, 'compact').some((l) => l.startsWith('#') || l.startsWith('>'))).toBe(false);
  });
});

describe('CardLayoutBody default parity — cafe-ingredient-search (Req 6.3)', () => {
  const layout = FALLBACK_CARD_LAYOUTS['cafe-ingredient-search'].REGULAR;

  it('matches the ingredient card lines and merges the surface chip', () => {
    const ingredient = item({
      name: 'Milk',
      companyName: 'Dairy Co',
      barcode: 'MLK1',
      location: 'Fridge',
      currentCount: 4,
      receivedCount: 20,
      soldCount: 16,
      thresholdCount: 5,
      costPrice: 48.5,
      sellingPrice: 60,
      priceToRetail: 60,
      maximumRetailPrice: 0,
      purchaseDate: '2026-10-01T00:00:00Z',
    });
    expect(lines(ingredient, layout, 'card', ['Low stock'])).toEqual([
      'Company: Dairy Co',
      'Barcode: MLK1',
      'Location: Fridge',
      '|',
      'Current: 4',
      'Received: 20 | Used: 16',
      'Threshold: 5',
      '*Cost: ₹48.50',
      '*Selling Price: ₹60.00',
      'Purchased: 1 Oct 2026',
      '#Low stock',
    ]);
  });

  it('hideSensitivePolicy removes the cost line (Req 7.8)', () => {
    const ingredient = item({ costPrice: 48.5, sellingPrice: 60, priceToRetail: 60, maximumRetailPrice: 0 });
    const out = lines(ingredient, layout, 'card', [], hideSensitivePolicy());
    expect(out).toContain('*Selling Price: ₹60.00');
    expect(out.some((l) => l.startsWith('*Cost'))).toBe(false);
  });
});

// ---- helpers --------------------------------------------------------------------------------------

function item(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'inv-1',
    lotId: 'lot-1',
    barcode: null,
    name: null,
    description: null,
    companyName: null,
    maximumRetailPrice: 0,
    costPrice: 0,
    priceToRetail: 0,
    receivedCount: 0,
    soldCount: 0,
    currentCount: 0,
    location: '',
    shopId: 'shop',
    ...overrides,
  } as InventoryItem;
}

/**
 * Flattens the rendered body into comparable lines: `|` for a divider, `*` prefix for a strong
 * line, `#` for each chip, `>` for the description.
 */
function lines(
  inventoryItem: InventoryItem,
  layout: ResolvedCardLayout,
  variant: 'card' | 'compact' = 'card',
  chips: string[] = [],
  visibility?: FieldVisibilityPolicy,
): string[] {
  const { container } = render(
    <CardLayoutBody
      item={inventoryItem}
      layout={layout}
      variant={variant}
      chips={chips}
      visibility={visibility}
    />,
  );
  const out: string[] = [];
  const nodes = container.querySelectorAll('hr, p, span, [class*="variant-caption"]');
  nodes.forEach((node) => {
    const el = node as HTMLElement;
    if (el.tagName === 'HR') {
      out.push('|');
      return;
    }
    const text = el.textContent?.trim() ?? '';
    if (!text) return;
    const cls = el.className ?? '';
    if (el.tagName === 'SPAN' && cls.includes('searchResultChip') && !cls.includes('Chips')) {
      out.push(`#${text}`);
    } else if (el.tagName === 'P' && cls.includes('searchResultDesc')) {
      out.push(`>${text}`);
    } else if (el.tagName === 'P') {
      out.push(cls.includes('searchResultLineStrong') ? `*${text}` : text);
    } else if (variant === 'compact' && cls.includes('variant-caption')) {
      out.push(cls.includes('weight-semibold') ? `*${text}` : text);
    }
  });
  return out;
}
