// Feature: advanced-product-search — company chips over the Scan & Sell dropdown (R7.2, R7.3).
import { Box, Button, Inline, Text } from '@inventory-platform/ui-kit';
import type { FacetValue } from '../../model/search.types';

/** At most this many companies are offered; the rest stay reachable through "All". */
export const COMPANY_CHIP_LIMIT = 5;

export interface CompanyChipsProps {
  companies: readonly FacetValue[];
  selected: string | null;
  onSelect: (company: string | null) => void;
  disabled?: boolean;
  className?: string;
}

/** The companies to offer: top five by count. Hidden when every result is from one company. */
export function visibleCompanyChips(companies: readonly FacetValue[]): FacetValue[] {
  const withResults = companies.filter((c) => c.count > 0);
  if (withResults.length < 2) return [];
  return [...withResults]
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, COMPANY_CHIP_LIMIT);
}

/**
 * True when a key press should pick chip N (Alt + 1…5). Plain digits are left alone because the
 * cashier may be typing "500mg" into the search box.
 */
export function chipIndexForKey(
  e: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>,
): number | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null;
  const n = Number(e.key);
  if (!Number.isInteger(n) || n < 1 || n > COMPANY_CHIP_LIMIT) return null;
  return n - 1;
}

export function CompanyChips({
  companies,
  selected,
  onSelect,
  disabled = false,
  className,
}: CompanyChipsProps) {
  const chips = visibleCompanyChips(companies);
  if (chips.length === 0 && !selected) {
    return null;
  }
  return (
    <Box className={className} role="group" aria-label="Filter by company (Alt + number)">
      <Inline gap="xs" align="center" flexWrap>
        <Button
          type="button"
          size="sm"
          variant={selected === null ? 'solid' : 'outline'}
          aria-pressed={selected === null}
          disabled={disabled}
          onClick={() => onSelect(null)}
        >
          All
        </Button>
        {chips.map((c, i) => (
          <Button
            key={c.value}
            type="button"
            size="sm"
            variant={selected === c.value ? 'solid' : 'outline'}
            aria-pressed={selected === c.value}
            aria-keyshortcuts={`Alt+${i + 1}`}
            title={`Alt+${i + 1}`}
            disabled={disabled}
            onClick={() => onSelect(selected === c.value ? null : c.value)}
          >
            {c.label || c.value}{' '}
            <Text as="span" variant="caption" color="secondary">
              {c.count.toLocaleString()}
            </Text>
          </Button>
        ))}
        {selected && !chips.some((c) => c.value === selected) ? (
          <Button
            type="button"
            size="sm"
            variant="solid"
            aria-pressed
            disabled={disabled}
            onClick={() => onSelect(null)}
          >
            {selected} ×
          </Button>
        ) : null}
      </Inline>
    </Box>
  );
}
