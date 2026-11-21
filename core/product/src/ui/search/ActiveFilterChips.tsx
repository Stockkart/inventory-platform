// Feature: advanced-product-search — chips for the active filter groups (R6.1, R6.4, R6.5, R6.6).
import { Button, Inline, SegmentedControl, Tag, Text } from '@inventory-platform/ui-kit';
import type { FilterGroup, MatchMode, SearchField } from '../../model/search.types';
import { chipLabel, chipText } from '../../search/filterChips';

const MATCH_OPTIONS = [
  { value: 'all', label: 'Match all' },
  { value: 'any', label: 'Match any' },
] as const;

export interface ActiveFilterChipsProps {
  filters: readonly FilterGroup[];
  fields: readonly SearchField[];
  match: MatchMode;
  onRemove: (group: FilterGroup) => void;
  onClearAll: () => void;
  onMatchChange: (match: MatchMode) => void;
  disabled?: boolean;
}

export function ActiveFilterChips({
  filters,
  fields,
  match,
  onRemove,
  onClearAll,
  onMatchChange,
  disabled = false,
}: ActiveFilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }
  return (
    <Inline gap="sm" align="center" flexWrap width="full" aria-label="Active filters">
      {filters.map((g) => {
        const { field, detail } = chipLabel(g, fields);
        return (
          <Tag
            key={chipText(g, fields)}
            variant="info"
            onRemove={disabled ? undefined : () => onRemove(g)}
            removeLabel={`Remove filter ${chipText(g, fields)}`}
          >
            <Text as="span" variant="caption" weight="semibold">
              {field}
            </Text>{' '}
            <Text as="span" variant="caption">
              {detail}
            </Text>
          </Tag>
        );
      })}
      {filters.length >= 2 ? (
        <SegmentedControl
          value={match}
          options={MATCH_OPTIONS}
          onChange={onMatchChange}
          disabled={disabled}
          aria-label="How filters combine"
        />
      ) : null}
      <Button variant="ghost" size="sm" onClick={onClearAll} disabled={disabled}>
        Clear all
      </Button>
      {match === 'any' && filters.length >= 2 ? (
        <Text variant="caption" color="secondary">
          Showing lots that match any one of these filters. Counts in the panel reflect the search
          text only.
        </Text>
      ) : null}
    </Inline>
  );
}
