// Feature: advanced-product-search — the filter strip under the search bar (R6.2, R6.3, R5.4).
//
// The strip starts almost empty: "+ Add filter" and the sort picker on the right. Picking a field
// adds a pill for it (and opens it); the pill shows what is chosen, ✕ removes it. Fields with a
// filter in the URL get their pill on load. Results take the full width below.
import { useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Checkbox,
  ChoiceList,
  FacetCheckboxList,
  FilterDropdown,
  FilterStrip,
  FormField,
  Inline,
  Input,
  Stack,
  type ChoiceOption,
  type FacetOption,
} from '@inventory-platform/ui-kit';
import type { FacetValue, SearchField, SearchFieldGroup } from '../../model/search.types';
import { useSearchValuesQuery } from '../../queries/search.queries';
import { chipLabel } from '../../search/filterChips';
import {
  findGroup,
  setExists,
  setRange,
  setWithinDays,
  toggleValue,
  type SearchState,
} from '../../search/searchState';

/** Facet lists longer than this get a "Find…" box (R5.4). */
export const FIND_BOX_THRESHOLD = 25;

const GROUP_ORDER: readonly SearchFieldGroup[] = ['product', 'lot', 'vertical', 'pricing', 'shop'];

export interface SearchFilterStripProps {
  fields: readonly SearchField[];
  state: SearchState;
  /**
   * Counts from the last search. `undefined` before the first search ("setting up"): the
   * dropdowns then list the known values without counts.
   */
  facets?: Record<string, FacetValue[]>;
  onChange: (next: SearchState) => void;
  /** Fields whose pill is on the strip without a filter yet. */
  pinned: readonly string[];
  onPin: (fieldKey: string) => void;
  onUnpin: (fieldKey: string) => void;
  disabled?: boolean;
  /** Right-aligned content, normally the sort picker. */
  end?: ReactNode;
}

export function SearchFilterStrip({
  fields,
  state,
  facets,
  onChange,
  pinned,
  onPin,
  onUnpin,
  disabled = false,
  end,
}: SearchFilterStripProps) {
  const ordered = useMemo(() => {
    const byGroup = new Map<SearchFieldGroup, SearchField[]>();
    for (const f of fields) {
      const list = byGroup.get(f.group) ?? [];
      list.push(f);
      byGroup.set(f.group, list);
    }
    const out: SearchField[] = [];
    for (const g of GROUP_ORDER) out.push(...(byGroup.get(g) ?? []));
    for (const [g, list] of byGroup) if (!GROUP_ORDER.includes(g)) out.push(...list);
    return out;
  }, [fields]);

  const filterable = ordered.filter(
    (f) => f.facet || f.type === 'date' || f.type === 'number' || f.ops.includes('in'),
  );
  const hasGroup = (key: string) => state.filters.some((g) => g.field === key);

  // A pill is visible when its field has a filter or was pinned; once a field's filter is removed
  // its empty pill goes too.
  const added = pinned;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const visible = useMemo(() => {
    const keys: string[] = [];
    for (const g of state.filters) if (!keys.includes(g.field)) keys.push(g.field);
    for (const k of added) if (!keys.includes(k)) keys.push(k);
    return keys
      .map((k) => filterable.find((f) => f.key === k))
      .filter((f): f is SearchField => Boolean(f));
  }, [state.filters, added, filterable]);
  const addable = filterable.filter((f) => !visible.includes(f));

  const addOptions: ChoiceOption[] = addable.map((f) => ({ value: f.key, label: f.label }));
  const add = (key: string) => {
    onPin(key);
    setOpenKey(key);
  };
  const remove = (field: SearchField) => {
    onUnpin(field.key);
    if (openKey === field.key) setOpenKey(null);
    if (hasGroup(field.key)) {
      onChange({ ...state, filters: state.filters.filter((g) => g.field !== field.key), page: 0 });
    }
  };
  return (
    <FilterStrip
      aria-label="Search filters"
      end={
        <>
          {addable.length > 0 ? (
            <FilterDropdown
              label="+ Add filter"
              open={openKey === ADD_KEY}
              onOpenChange={(o) => setOpenKey(o ? ADD_KEY : null)}
              disabled={disabled}
              alignRight
              panelTitle="Add a filter"
            >
              <ChoiceList
                aria-label="Filters to add"
                options={addOptions}
                value=""
                onChange={add}
              />
            </FilterDropdown>
          ) : null}
          {end}
        </>
      }
    >
      {visible.map((field) => (
        <FieldDropdown
          key={field.key}
          field={field}
          state={state}
          facetValues={facets?.[field.key]}
          hasCounts={facets !== undefined}
          onChange={onChange}
          onRemove={() => remove(field)}
          open={openKey === field.key}
          onOpenChange={(o) => setOpenKey(o ? field.key : null)}
          disabled={disabled}
          fields={fields}
        />
      ))}
    </FilterStrip>
  );
}

const ADD_KEY = '__add';

// ---- one field -------------------------------------------------------------------------------

interface FieldProps {
  field: SearchField;
  state: SearchState;
  facetValues: FacetValue[] | undefined;
  hasCounts: boolean;
  onChange: (next: SearchState) => void;
  disabled: boolean;
}

interface FieldDropdownProps extends FieldProps {
  fields: readonly SearchField[];
  onRemove: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FieldDropdown({
  field,
  fields,
  state,
  facetValues,
  hasCounts,
  onChange,
  onRemove,
  open,
  onOpenChange,
  disabled,
}: FieldDropdownProps) {
  const active = state.filters.filter((g) => g.field === field.key);
  const count = active.reduce((n, g) => n + (g.op === 'in' ? g.values.length : 1), 0);
  const value =
    active.length > 0 ? active.map((g) => chipLabel(g, fields).detail).join('; ') : undefined;
  const clear = () => {
    let next = state;
    for (const g of active) next = { ...next, filters: next.filters.filter((x) => x !== g) };
    onChange({ ...next, page: 0 });
  };
  const isForm = field.type === 'date' || field.type === 'number';
  return (
    <FilterDropdown
      label={field.label}
      value={value}
      count={count}
      onRemove={onRemove}
      removeLabel={`Remove ${field.label} filter`}
      open={open}
      onOpenChange={onOpenChange}
      disabled={disabled}
      wide={isForm}
      headerAction={
        count > 0 ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
        ) : undefined
      }
    >
      {field.type === 'enum' ? (
        <EnumFacet
          field={field}
          state={state}
          facetValues={facetValues}
          onChange={onChange}
          disabled={disabled}
        />
      ) : field.type === 'text' ? (
        <TextFacet
          field={field}
          state={state}
          facetValues={facetValues}
          hasCounts={hasCounts}
          onChange={onChange}
          disabled={disabled}
        />
      ) : field.type === 'date' ? (
        <DateControls field={field} state={state} onChange={onChange} disabled={disabled} />
      ) : (
        <NumberControls field={field} state={state} onChange={onChange} disabled={disabled} />
      )}
    </FilterDropdown>
  );
}

function selectedValues(state: SearchState, key: string): string[] {
  return findGroup(state.filters, key, 'in')?.values ?? [];
}

/** Every allowed value, in catalog order, with the count from the last search when known. */
function EnumFacet({
  field,
  state,
  facetValues,
  onChange,
  disabled,
}: Omit<FieldProps, 'hasCounts'>) {
  const counts = new Map(facetValues?.map((v) => [v.value, v.count]));
  const options: FacetOption[] = field.values.map((v) => ({
    value: v.value,
    label: v.label,
    count: facetValues ? counts.get(v.value) ?? 0 : undefined,
  }));
  return (
    <FacetCheckboxList
      aria-label={field.label}
      options={options}
      selected={selectedValues(state, field.key)}
      onToggle={(value) => onChange(toggleValue(state, field.key, value))}
      disabled={disabled}
      scroll
    />
  );
}

/**
 * Text fields. Counted ones (company, location) list the top values with counts, the ticked ones
 * always first, and a "Find…" box backed by `/search/values` when the list is long or there are no
 * counts yet. One-per-product fields (name, barcode, HSN, batch) have no counts to show, so the
 * panel is the Find box: type a few letters, tick the matches.
 */
function TextFacet({ field, state, facetValues, hasCounts, onChange, disabled }: FieldProps) {
  const [find, setFind] = useState('');
  const selected = selectedValues(state, field.key);
  const needFind =
    !hasCounts || (facetValues?.length ?? 0) >= FIND_BOX_THRESHOLD || find.length > 0;
  const suggestions = useSearchValuesQuery(needFind ? field.key : null, find);

  const options: FacetOption[] = [];
  const seen = new Set<string>();
  const push = (value: string, label: string, count?: number) => {
    if (seen.has(value)) return;
    seen.add(value);
    options.push({ value, label, count });
  };
  for (const v of selected) push(v, v, facetValues?.find((f) => f.value === v)?.count);
  if (find.trim()) {
    for (const v of suggestions.data ?? [])
      push(v, v, facetValues?.find((f) => f.value === v)?.count);
  } else {
    for (const f of facetValues ?? []) push(f.value, f.label || f.value, f.count);
    if (!hasCounts) for (const v of suggestions.data ?? []) push(v, v);
  }

  return (
    <Stack gap="sm">
      {needFind ? (
        <Input
          type="search"
          value={find}
          onChange={(e) => setFind(e.currentTarget.value)}
          placeholder={`Find ${field.label.toLowerCase()}…`}
          aria-label={`Find ${field.label}`}
          disabled={disabled}
          autoFocus
        />
      ) : null}
      <FacetCheckboxList
        aria-label={field.label}
        options={options}
        selected={selected}
        onToggle={(value) => onChange(toggleValue(state, field.key, value))}
        disabled={disabled}
        scroll
        emptyText={suggestions.isLoading ? 'Loading…' : find ? 'No matches' : 'No values yet'}
      />
    </Stack>
  );
}

/** Dates: "within the next N days", or a from / to range, plus "has a value" when allowed. */
function DateControls({
  field,
  state,
  onChange,
  disabled,
}: Omit<FieldProps, 'facetValues' | 'hasCounts'>) {
  const within = findGroup(state.filters, field.key, 'withinDays');
  const range = findGroup(state.filters, field.key, 'between');
  const exists = findGroup(state.filters, field.key, 'exists');
  const [days, setDays] = useState(within?.values[0] ?? '');
  const [from, setFrom] = useState(range?.from ?? '');
  const [to, setTo] = useState(range?.to ?? '');
  const commitDays = () =>
    onChange(setWithinDays(state, field.key, days.trim() ? Number(days) : null));
  const commitRange = () => onChange(setRange(state, field.key, from || null, to || null));

  return (
    <Stack gap="sm">
      {field.ops.includes('withinDays') ? (
        <FormField label="Within the next (days)" htmlFor={`${field.key}-days`}>
          <Input
            id={`${field.key}-days`}
            type="number"
            min={1}
            inputMode="numeric"
            value={days}
            placeholder="e.g. 90"
            disabled={disabled}
            onChange={(e) => setDays(e.currentTarget.value)}
            onBlur={commitDays}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDays();
            }}
          />
        </FormField>
      ) : null}
      {field.ops.includes('between') ? (
        <Inline gap="sm" align="end" width="full">
          <FormField label="From" htmlFor={`${field.key}-from`}>
            <Input
              id={`${field.key}-from`}
              type="date"
              value={from}
              disabled={disabled}
              onChange={(e) => setFrom(e.currentTarget.value)}
              onBlur={commitRange}
            />
          </FormField>
          <FormField label="To" htmlFor={`${field.key}-to`}>
            <Input
              id={`${field.key}-to`}
              type="date"
              value={to}
              disabled={disabled}
              onChange={(e) => setTo(e.currentTarget.value)}
              onBlur={commitRange}
            />
          </FormField>
        </Inline>
      ) : null}
      {field.ops.includes('exists') ? (
        <Checkbox
          id={`${field.key}-exists`}
          label="Has a value"
          checked={Boolean(exists)}
          disabled={disabled}
          onChange={(e) => onChange(setExists(state, field.key, e.currentTarget.checked))}
        />
      ) : null}
    </Stack>
  );
}

function NumberControls({
  field,
  state,
  onChange,
  disabled,
}: Omit<FieldProps, 'facetValues' | 'hasCounts'>) {
  const range = findGroup(state.filters, field.key, 'between');
  const [from, setFrom] = useState(range?.from ?? '');
  const [to, setTo] = useState(range?.to ?? '');
  const commit = () => onChange(setRange(state, field.key, from || null, to || null));
  return (
    <Inline gap="sm" align="end" width="full">
      <FormField label="Min" htmlFor={`${field.key}-min`}>
        <Input
          id={`${field.key}-min`}
          type="number"
          inputMode="decimal"
          value={from}
          disabled={disabled}
          onChange={(e) => setFrom(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
        />
      </FormField>
      <FormField label="Max" htmlFor={`${field.key}-max`}>
        <Input
          id={`${field.key}-max`}
          type="number"
          inputMode="decimal"
          value={to}
          disabled={disabled}
          onChange={(e) => setTo(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
        />
      </FormField>
    </Inline>
  );
}
