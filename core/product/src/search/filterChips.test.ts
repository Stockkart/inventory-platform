// Feature: advanced-product-search — chip wording table (R6.4)
import { describe, expect, it } from 'vitest';
import type { SearchField } from '../model/search.types';
import { chipLabel, chipText, humanize } from './filterChips';

const fields: SearchField[] = [
  {
    key: 'companyName',
    label: 'Company',
    group: 'product',
    source: 'product',
    type: 'text',
    ops: ['in'],
    facet: true,
    sortable: true,
    values: [],
  },
  {
    key: 'stockState',
    label: 'Stock',
    group: 'lot',
    source: 'computed',
    type: 'enum',
    ops: ['in'],
    facet: true,
    sortable: false,
    values: [
      { value: 'IN_STOCK', label: 'In stock' },
      { value: 'LOW_STOCK', label: 'Low stock' },
    ],
  },
  {
    key: 'expiryDate',
    label: 'Expiry',
    group: 'vertical',
    source: 'vertical',
    type: 'date',
    ops: ['between', 'withinDays', 'exists'],
    facet: false,
    sortable: true,
    values: [],
  },
  {
    key: 'vertical.warrantyMonths',
    label: 'Warranty',
    group: 'vertical',
    source: 'vertical',
    type: 'number',
    ops: ['between'],
    facet: false,
    sortable: false,
    values: [],
  },
];

describe('chipLabel', () => {
  it.each([
    [{ field: 'companyName', op: 'in', values: ['Cipla'] }, 'Company: Cipla'],
    [{ field: 'companyName', op: 'in', values: ['Cipla', 'GSK'] }, 'Company: Cipla or GSK'],
    [{ field: 'companyName', op: 'in', values: ['A', 'B', 'C'] }, 'Company: A, B or C'],
    [
      { field: 'companyName', op: 'in', values: ['A', 'B', 'C', 'D', 'E'] },
      'Company: A, B or C + 2 more',
    ],
    [{ field: 'stockState', op: 'in', values: ['LOW_STOCK'] }, 'Stock: Low stock'],
    [{ field: 'companyName', op: 'matches', values: ['cip*'] }, 'Company: matches "cip*"'],
    [{ field: 'expiryDate', op: 'withinDays', values: ['90'] }, 'Expiry: within 90 days'],
    [{ field: 'expiryDate', op: 'withinDays', values: ['1'] }, 'Expiry: within 1 day'],
    [{ field: 'expiryDate', op: 'exists', values: [] }, 'Expiry: has a value'],
    [
      { field: 'expiryDate', op: 'between', values: [], from: '2026-01-05', to: null },
      'Expiry: after 5 Jan 2026',
    ],
    [
      { field: 'expiryDate', op: 'between', values: [], from: null, to: '2026-01-05' },
      'Expiry: before 5 Jan 2026',
    ],
    [
      { field: 'expiryDate', op: 'between', values: [], from: '2026-01-05', to: '2026-02-05' },
      'Expiry: 5 Jan 2026 to 5 Feb 2026',
    ],
    [
      { field: 'vertical.warrantyMonths', op: 'between', values: [], from: '6', to: null },
      'Warranty: at least 6',
    ],
    [
      { field: 'vertical.warrantyMonths', op: 'between', values: [], from: null, to: '24' },
      'Warranty: at most 24',
    ],
    [{ field: 'vertical.unknownThing', op: 'in', values: ['x'] }, 'Unknown Thing: x'],
  ] as const)('%j → %s', (group, expected) => {
    expect(chipText({ ...group, values: [...group.values] }, fields)).toBe(expected);
  });

  it('splits field and detail for the chip layout', () => {
    expect(chipLabel({ field: 'companyName', op: 'in', values: ['Cipla'] }, fields)).toEqual({
      field: 'Company',
      detail: 'Cipla',
    });
  });

  it('humanizes keys', () => {
    expect(humanize('vertical.brandName')).toBe('Brand Name');
    expect(humanize('hsn_code')).toBe('Hsn code');
  });
});
