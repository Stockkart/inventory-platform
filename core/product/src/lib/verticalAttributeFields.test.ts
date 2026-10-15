import { describe, expect, it } from 'vitest';
import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import { verticalAttributeFieldsOf, verticalFieldDisplay } from './verticalAttributeFields';

/** Inventory fields of the sports seed (`sports-v1.json`) plus the medical lot fields. */
const FIELDS: VerticalSchemaFieldDef[] = [
  { key: 'name', storage: 'core', required: true, showIn: ['registration'] },
  { key: 'companyName', storage: 'core', showIn: ['registration'] },
  { key: 'sport', storage: 'extension', type: 'enum', required: true, showIn: ['registration'] },
  { key: 'brand', storage: 'extension', required: true, showIn: ['registration', 'basic'] },
  { key: 'model', storage: 'extension', required: true, showIn: ['registration'] },
  { key: 'size', storage: 'extension', showIn: ['registration', 'scan-sell'] },
  { key: 'warrantyMonths', storage: 'extension', type: 'number', showIn: ['registration'] },
  { key: 'batchNo', storage: 'extension', showIn: ['registration'] },
  { key: 'expiryDate', storage: 'extension', type: 'date', showIn: ['registration'] },
  { key: 'internalNote', storage: 'extension', showIn: ['invoice'] },
];

describe('verticalAttributeFieldsOf', () => {
  it('lists the vertical extension fields shown at registration, in schema order', () => {
    const fields = verticalAttributeFieldsOf({ entities: { inventory: { fields: FIELDS } } });
    expect(fields.map((f) => f.key)).toEqual(['sport', 'brand', 'model', 'size', 'warrantyMonths']);
  });

  it('leaves out batch and expiry, which the modal already has rows for', () => {
    const keys = verticalAttributeFieldsOf({ entities: { inventory: { fields: FIELDS } } }).map(
      (f) => f.key,
    );
    expect(keys).not.toContain('batchNo');
    expect(keys).not.toContain('expiryDate');
  });

  it('is empty before the schema has loaded', () => {
    expect(verticalAttributeFieldsOf(null)).toEqual([]);
    expect(verticalAttributeFieldsOf({ entities: {} })).toEqual([]);
  });
});

describe('verticalFieldDisplay', () => {
  const brand: VerticalSchemaFieldDef = { key: 'brand', storage: 'extension' };
  const bought: VerticalSchemaFieldDef = { key: 'boughtOn', storage: 'extension', type: 'date' };

  it('shows the stored value, or a dash when there is none', () => {
    expect(verticalFieldDisplay({ verticalFields: { brand: 'BLUE HEAVEN' } }, brand)).toBe(
      'BLUE HEAVEN',
    );
    expect(verticalFieldDisplay({ verticalFields: {} }, brand)).toBe('—');
    expect(verticalFieldDisplay({ verticalFields: null }, brand)).toBe('—');
  });

  it('shows a date field as a local date', () => {
    const text = verticalFieldDisplay(
      { verticalFields: { boughtOn: '2026-10-13T00:00:00Z' } },
      bought,
    );
    expect(text).toContain('2026');
    expect(text).toContain('13');
  });
});
