import { describe, expect, it } from 'vitest';
import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import {
  buildVerticalFieldsUpdate,
  formatVerticalFieldDisplay,
  initVerticalDraft,
  schemaOnlyFields,
  verticalDisplayName,
} from './verticalFieldsEdit';

const CAFE: VerticalSchemaFieldDef[] = [
  { key: 'name', storage: 'core' },
  { key: 'ingredientType', type: 'enum', storage: 'extension', values: ['dairy', 'dry'] },
  { key: 'unitOfMeasure', type: 'enum', storage: 'extension', values: ['kg', 'g'] },
  { key: 'sellDirect', type: 'enum', storage: 'extension', values: ['no', 'yes'] },
];

const MEDICAL: VerticalSchemaFieldDef[] = [
  { key: 'name', storage: 'core' },
  { key: 'batchNo', storage: 'extension' },
  { key: 'expiryDate', type: 'date', storage: 'extension' },
  { key: 'companyName', storage: 'core' },
  { key: 'itemType', type: 'enum', storage: 'core', values: ['NORMAL', 'COSTLY', 'DEGREE'] },
  { key: 'itemTypeDegree', type: 'number', storage: 'core' },
];

const SPORTS: VerticalSchemaFieldDef[] = [
  { key: 'hsn', storage: 'core' },
  { key: 'brand', storage: 'extension' },
  { key: 'warrantyMonths', type: 'number', storage: 'extension' },
  { key: 'launchedOn', type: 'date', storage: 'extension' },
  { key: 'shelf', storage: 'core' },
];

describe('schemaOnlyFields', () => {
  it('drops the core keys the modal renders itself and keeps the rest in order', () => {
    expect(schemaOnlyFields(MEDICAL).map((f) => f.key)).toEqual(['batchNo', 'expiryDate']);
    expect(schemaOnlyFields(CAFE).map((f) => f.key)).toEqual([
      'ingredientType',
      'unitOfMeasure',
      'sellDirect',
    ]);
    expect(schemaOnlyFields(SPORTS).map((f) => f.key)).toEqual([
      'brand',
      'warrantyMonths',
      'launchedOn',
      'shelf',
    ]);
  });
});

describe('initVerticalDraft', () => {
  it('reads the bag, falls back to legacy top-level values, and trims dates to the day', () => {
    const item = {
      verticalFields: { brand: 'Yonex', launchedOn: '2024-03-01T00:00:00Z' },
      warrantyMonths: 12,
    } as Record<string, unknown>;
    expect(initVerticalDraft(item, schemaOnlyFields(SPORTS))).toEqual({
      brand: 'Yonex',
      warrantyMonths: '12',
      launchedOn: '2024-03-01',
      shelf: '',
    });
  });
});

describe('buildVerticalFieldsUpdate', () => {
  const item = {
    verticalFields: { brand: 'Yonex', warrantyMonths: 12, launchedOn: '2024-03-01T00:00:00Z' },
    shelf: 'A1',
  };
  const fields = schemaOnlyFields(SPORTS);

  it('sends nothing when the draft matches the item', () => {
    const update = buildVerticalFieldsUpdate(item, fields, initVerticalDraft(item, fields));
    expect(update.changedKeys).toEqual([]);
    expect(update.core).toEqual({});
    expect(update.extension).toEqual({});
  });

  it('sends only the changed keys, typed, split by storage', () => {
    const draft = {
      ...initVerticalDraft(item, fields),
      brand: 'Li-Ning ',
      warrantyMonths: '24',
      shelf: 'B2',
    };
    const update = buildVerticalFieldsUpdate(item, fields, draft);
    expect(update.changedKeys).toEqual(['brand', 'warrantyMonths', 'shelf']);
    expect(update.extension).toEqual({ brand: 'Li-Ning', warrantyMonths: 24 });
    expect(update.core).toEqual({ shelf: 'B2' });
  });

  it('a date is unchanged when only the time part differs, and ISO when it changes', () => {
    const same = buildVerticalFieldsUpdate(item, fields, {
      ...initVerticalDraft(item, fields),
      launchedOn: '2024-03-01',
    });
    expect(same.changedKeys).toEqual([]);
    const moved = buildVerticalFieldsUpdate(item, fields, {
      ...initVerticalDraft(item, fields),
      launchedOn: '2025-01-15',
    });
    expect(moved.extension).toEqual({ launchedOn: '2025-01-15T00:00:00Z' });
  });

  it('clearing a field sends null', () => {
    const update = buildVerticalFieldsUpdate(item, fields, {
      ...initVerticalDraft(item, fields),
      brand: '',
      shelf: '',
    });
    expect(update.extension).toEqual({ brand: null });
    expect(update.core).toEqual({ shelf: null });
  });

  it('coerces yes/no to booleans for sellDirect', () => {
    const cafeItem = { verticalFields: { sellDirect: false } };
    const cafeFields = schemaOnlyFields(CAFE);
    const update = buildVerticalFieldsUpdate(cafeItem, cafeFields, {
      ...initVerticalDraft(cafeItem, cafeFields),
      sellDirect: 'yes',
    });
    expect(update.extension).toEqual({ sellDirect: true });
  });
});

describe('formatVerticalFieldDisplay', () => {
  it('prints a dash for empty, a local date for dates, Yes/No for sellDirect', () => {
    expect(formatVerticalFieldDisplay({ key: 'brand' }, '')).toBe('—');
    expect(formatVerticalFieldDisplay({ key: 'd', type: 'date' }, '2024-03-01T00:00:00Z')).toBe(
      new Date('2024-03-01T00:00:00Z').toLocaleDateString('en-IN'),
    );
    expect(formatVerticalFieldDisplay({ key: 'sellDirect' }, 'yes')).toBe('Yes');
    expect(formatVerticalFieldDisplay({ key: 'sellDirect' }, 'false')).toBe('No');
  });
});

describe('verticalDisplayName', () => {
  it('turns an id into a heading', () => {
    expect(verticalDisplayName('cafe')).toBe('Cafe');
    expect(verticalDisplayName('sports-goods')).toBe('Sports Goods');
    expect(verticalDisplayName(null)).toBe('Vertical');
  });
});
