// Feature: advanced-product-search — sort picker built from the catalog's sortable fields (R6.7).
//
// A pill in the filter strip ("Sort: Expiry, soonest first") that opens a list grouped by field,
// each with its two directions, and a check mark on the current choice.
import { useState } from 'react';
import { ChoiceList, FilterDropdown, type ChoiceOption } from '@inventory-platform/ui-kit';
import type { SearchField } from '../../model/search.types';

export interface SortSelectProps {
  fields: readonly SearchField[];
  /** `fieldKey:asc|desc`, or `null` for the shop's default order. */
  value: string | null;
  /** What the server uses when `value` is null, for the "Default" line. */
  defaultSort?: string | null;
  onChange: (sort: string | null) => void;
  disabled?: boolean;
}

const DEFAULT = '__default';

export function sortOptions(
  fields: readonly SearchField[],
  defaultSort?: string | null,
): ChoiceOption[] {
  const out: ChoiceOption[] = [
    {
      value: DEFAULT,
      label: 'Default order',
      hint: defaultSort ? describeSort(defaultSort, fields) : undefined,
    },
  ];
  for (const f of fields) {
    if (!f.sortable) continue;
    const [ascLabel, descLabel] = directionLabels(f);
    out.push({ value: `${f.key}:asc`, label: capitalize(ascLabel), group: f.label });
    out.push({ value: `${f.key}:desc`, label: capitalize(descLabel), group: f.label });
  }
  return out;
}

/** "Expiry, soonest first" — for the pill and the Default hint. */
export function describeSort(sort: string, fields: readonly SearchField[]): string {
  const [key, dir = 'asc'] = sort.split(':');
  const field = fields.find((f) => f.key === key);
  if (!field) return sort;
  const [ascLabel, descLabel] = directionLabels(field);
  return `${field.label}, ${dir === 'desc' ? descLabel : ascLabel}`;
}

function directionLabels(field: SearchField): [string, string] {
  switch (field.type) {
    case 'date':
      return ['soonest first', 'latest first'];
    case 'number':
      return ['low to high', 'high to low'];
    default:
      return ['A to Z', 'Z to A'];
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SortSelect({ fields, value, defaultSort, onChange, disabled }: SortSelectProps) {
  const [open, setOpen] = useState(false);
  const current = value ?? defaultSort;
  const summary = current ? describeSort(current, fields) : 'Default';
  return (
    <FilterDropdown
      label={`Sort: ${summary}`}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      alignRight
      panelTitle="Sort by"
    >
      <ChoiceList
        aria-label="Sort results"
        options={sortOptions(fields, defaultSort)}
        value={value ?? DEFAULT}
        onChange={(next) => {
          onChange(next === DEFAULT ? null : next);
          setOpen(false);
        }}
      />
    </FilterDropdown>
  );
}
