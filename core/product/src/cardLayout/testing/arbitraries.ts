import fc from 'fast-check';
import type { InventoryItem } from '../../model/types';
import type { LabelSourceGroup, LabelValueType } from '../../model/labelLayout.types';
import type {
  CardEmphasis,
  CardOptions,
  FieldSensitivity,
  ResolvedCardField,
  ResolvedCardLayout,
  ResolvedCardSection,
} from '../../model/cardLayout.types';

/** fast-check arbitraries shared by the card layout property tests. */

export const EMPHASES: CardEmphasis[] = ['NORMAL', 'STRONG', 'MUTED'];
export const VALUE_TYPES: LabelValueType[] = ['text', 'number', 'currency', 'date', 'percentage'];
export const SOURCE_GROUPS: LabelSourceGroup[] = ['product', 'lot', 'pricing', 'vertical'];
export const SENSITIVITIES: FieldSensitivity[] = ['PUBLIC', 'SHOP_INTERNAL'];

/**
 * Item paths the generated fields read from. Each maps to a property the item arbitrary fills
 * with a value of a matching kind, so a generated layout exercises real reads.
 */
export const ITEM_PATHS: Record<string, LabelValueType> = {
  companyName: 'text',
  barcode: 'text',
  location: 'text',
  description: 'text',
  hsn: 'text',
  maximumRetailPrice: 'currency',
  costPrice: 'currency',
  priceToRetail: 'currency',
  receivedCount: 'number',
  soldCount: 'number',
  currentCount: 'number',
  thresholdCount: 'number',
  saleAdditionalDiscount: 'percentage',
  purchaseDate: 'date',
  createdAt: 'date',
  'verticalFields.brand': 'text',
  'verticalFields.expiryDate': 'date',
  'verticalFields.missing': 'text',
};

const maybe = <T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | null> => fc.option(arb, { nil: null });

export const inventoryItemArb: fc.Arbitrary<InventoryItem> = fc
  .record({
    id: fc.uuid(),
    name: maybe(fc.string({ minLength: 1, maxLength: 20 })),
    companyName: maybe(fc.string({ minLength: 1, maxLength: 20 })),
    barcode: maybe(fc.string({ minLength: 1, maxLength: 14 })),
    location: fc.string({ maxLength: 6 }),
    description: maybe(fc.string({ maxLength: 30 })),
    hsn: maybe(fc.string({ maxLength: 8 })),
    maximumRetailPrice: fc.double({ min: 0, max: 10000, noNaN: true }),
    costPrice: fc.double({ min: 0, max: 10000, noNaN: true }),
    priceToRetail: fc.double({ min: 0, max: 10000, noNaN: true }),
    sellingPrice: maybe(fc.double({ min: 0, max: 10000, noNaN: true })),
    receivedCount: fc.integer({ min: 0, max: 500 }),
    soldCount: fc.integer({ min: 0, max: 500 }),
    currentCount: fc.integer({ min: 0, max: 500 }),
    availableCount: maybe(fc.integer({ min: 0, max: 500 })),
    thresholdCount: fc.integer({ min: 0, max: 50 }),
    saleAdditionalDiscount: maybe(fc.double({ min: 0, max: 100, noNaN: true })),
    purchaseDate: maybe(isoDateArb()),
    createdAt: maybe(isoDateArb()),
    billingMode: fc.constantFrom('REGULAR', 'BASIC', undefined),
    itemType: fc.constantFrom('NORMAL', 'COSTLY', 'DEGREE', undefined),
    itemTypeDegree: maybe(fc.integer({ min: 2, max: 30 })),
    discountApplicable: fc.constantFrom('DISCOUNT', 'SCHEME', 'DISCOUNT_AND_SCHEME', undefined),
    scheme: maybe(fc.integer({ min: 0, max: 5 })),
    verticalFields: maybe(
      fc.record({
        brand: maybe(fc.string({ minLength: 1, maxLength: 10 })),
        expiryDate: maybe(isoDateArb()),
        batchNo: maybe(fc.string({ minLength: 1, maxLength: 8 })),
      }),
    ),
  })
  .map(
    (r) =>
      ({
        ...r,
        lotId: r.id,
        shopId: 'shop',
        itemTypeDegree: r.itemTypeDegree ?? undefined,
      } as unknown as InventoryItem),
  );

export function isoDateArb(): fc.Arbitrary<string> {
  return fc
    .date({
      min: new Date('2000-01-01T00:00:00Z'),
      max: new Date('2040-12-31T00:00:00Z'),
      noInvalidDate: true,
    })
    .map((d) => d.toISOString());
}

export const resolvedFieldArb: fc.Arbitrary<ResolvedCardField> = fc
  .constantFrom(...Object.keys(ITEM_PATHS))
  .chain((itemPath) =>
    fc.record({
      fieldKey: fc.constant(`f.${itemPath}`),
      label: fc.string({ minLength: 1, maxLength: 12 }),
      showLabel: fc.boolean(),
      emphasis: fc.constantFrom(...EMPHASES),
      valueType: fc.constant(ITEM_PATHS[itemPath]),
      sourceGroup: fc.constantFrom(...SOURCE_GROUPS),
      itemPath: fc.constant(itemPath),
      schemaApiKey: fc.constant(null),
      sensitivity: fc.constantFrom(...SENSITIVITIES),
    }),
  );

export const cardOptionsArb: fc.Arbitrary<CardOptions> = fc.record({
  blankValueBehavior: fc.constantFrom('HIDE_LINE', 'SHOW_DASH'),
  showAttributeChips: fc.boolean(),
  showDescription: fc.boolean(),
});

export const resolvedSectionArb: fc.Arbitrary<ResolvedCardSection> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  title: maybe(fc.string({ maxLength: 10 })),
  dividerAbove: fc.boolean(),
  rows: fc.array(
    fc.record({ fields: fc.array(resolvedFieldArb, { minLength: 1, maxLength: 3 }) }),
    { minLength: 1, maxLength: 4 },
  ),
});

export const resolvedLayoutArb: fc.Arbitrary<ResolvedCardLayout> = fc.record({
  sections: fc.array(resolvedSectionArb, { maxLength: 4 }).map(uniqueSectionIds),
  options: cardOptionsArb,
});

function uniqueSectionIds(sections: ResolvedCardSection[]): ResolvedCardSection[] {
  return sections.map((s, i) => ({ ...s, id: `${s.id}-${i}` }));
}
