// Feature: advanced-product-search — plain-English wording for active filter chips (R6.4).
import type { FilterGroup, SearchField } from '../model/search.types';

export interface ChipLabel {
  /** The field, e.g. "Company". */
  field: string;
  /** What is being asked of it, e.g. "Cipla or GSK", "within 90 days", "has a value". */
  detail: string;
}

/** Up to this many values are spelled out; beyond it the chip says "A, B + 3 more". */
export const CHIP_VALUE_LIMIT = 3;

export function chipLabel(group: FilterGroup, fields: readonly SearchField[]): ChipLabel {
  const field = fields.find((f) => f.key === group.field);
  const fieldLabel = field?.label ?? humanize(group.field);
  const display = (v: string) => field?.values.find((ev) => ev.value === v)?.label ?? v;

  switch (group.op) {
    case 'in': {
      const shown = group.values.slice(0, CHIP_VALUE_LIMIT).map(display);
      const more = group.values.length - shown.length;
      const list =
        shown.length > 1
          ? `${shown.slice(0, -1).join(', ')} or ${shown[shown.length - 1]}`
          : shown[0] ?? '';
      return { field: fieldLabel, detail: more > 0 ? `${list} + ${more} more` : list };
    }
    case 'matches':
      return { field: fieldLabel, detail: `matches "${group.values[0] ?? ''}"` };
    case 'between': {
      const from = group.from ? formatBound(group.from, field?.type) : null;
      const to = group.to ? formatBound(group.to, field?.type) : null;
      if (from && to) return { field: fieldLabel, detail: `${from} to ${to}` };
      if (from)
        return {
          field: fieldLabel,
          detail: field?.type === 'date' ? `after ${from}` : `at least ${from}`,
        };
      return {
        field: fieldLabel,
        detail: field?.type === 'date' ? `before ${to}` : `at most ${to}`,
      };
    }
    case 'withinDays': {
      const n = Number(group.values[0]);
      return {
        field: fieldLabel,
        detail: n === 1 ? 'within 1 day' : `within ${group.values[0]} days`,
      };
    }
    case 'exists':
      return { field: fieldLabel, detail: 'has a value' };
  }
}

/** One line for screen readers and tooltips: "Company: Cipla or GSK". */
export function chipText(group: FilterGroup, fields: readonly SearchField[]): string {
  const { field, detail } = chipLabel(group, fields);
  return `${field}: ${detail}`;
}

function formatBound(raw: string, type: SearchField['type'] | undefined): string {
  if (type === 'date') {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return raw;
}

/** `vertical.brandName` → "Brand Name" when the catalog has no label for a key. */
export function humanize(key: string): string {
  const last = key.split('.').pop() ?? key;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
