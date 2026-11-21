import { useState } from 'react';
import {
  FacetCheckboxList,
  FilterDropdown,
  FilterStrip,
  Switch,
  Text,
} from '@inventory-platform/ui-kit';
import {
  REGISTER_SOURCES,
  REGISTER_SOURCE_LABELS,
  type RegisterFilters,
  type RegisterSource,
} from '@inventory-platform/hr/types';

export interface RegisterFilterBarProps {
  filters: RegisterFilters;
  onChange: (next: RegisterFilters) => void;
  /** The "Flagged" toggle (R8.11); chips exist on the daily register only. */
  showFlagged?: boolean;
  /** How many rows the filters left, out of how many; shown so an empty list is not a surprise. */
  shown?: { matched: number; total: number };
}

const SOURCE_OPTIONS = REGISTER_SOURCES.map((value) => ({
  value,
  label: REGISTER_SOURCE_LABELS[value],
}));

/**
 * The registers' filter bar (R8.10–R8.11): a "Source" multi-select (Hand, My HR, Attendance app)
 * and, on the daily register, a "Flagged" toggle. Both narrow the list and combine as AND; the
 * predicate itself is `matchesRegisterFilters`.
 */
export function RegisterFilterBar({
  filters,
  onChange,
  showFlagged = false,
  shown,
}: RegisterFilterBarProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const chosen = filters.sources.map((s) => REGISTER_SOURCE_LABELS[s]).join(', ');
  const toggleSource = (value: string) => {
    const source = value as RegisterSource;
    const sources = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : REGISTER_SOURCES.filter((s) => s === source || filters.sources.includes(s));
    onChange({ ...filters, sources });
  };

  return (
    <FilterStrip
      aria-label="Register filters"
      end={
        shown && shown.matched !== shown.total ? (
          <Text as="span" variant="caption" color="secondary" aria-live="polite">
            {shown.matched} of {shown.total} shown
          </Text>
        ) : undefined
      }
    >
      <FilterDropdown
        label="Source"
        value={chosen || undefined}
        count={filters.sources.length}
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        onRemove={
          filters.sources.length > 0 ? () => onChange({ ...filters, sources: [] }) : undefined
        }
      >
        <FacetCheckboxList
          aria-label="Source"
          options={SOURCE_OPTIONS}
          selected={filters.sources}
          onToggle={toggleSource}
        />
      </FilterDropdown>
      {showFlagged ? (
        <Switch
          label="Flagged"
          id="hr-register-flagged"
          checked={filters.flaggedOnly}
          onChange={(e) => onChange({ ...filters, flaggedOnly: e.target.checked })}
        />
      ) : null}
    </FilterStrip>
  );
}
