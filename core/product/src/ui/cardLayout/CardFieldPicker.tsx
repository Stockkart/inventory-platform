import { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  Inline,
  SearchInput,
  Stack,
  Text,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';
import type { CatalogFieldGroup } from './cardLayoutDraft';

export interface CardFieldPickerProps {
  groups: CatalogFieldGroup[];
  enabledKeys: string[];
  /** Keys the current surface forbids; shown disabled with a hint. */
  excludedKeys: string[];
  /** When true every unchecked field is disabled (total field cap reached). */
  atLimit: boolean;
  maxFields: number;
  onToggle(fieldKey: string, on: boolean): void;
}

function checkboxId(fieldKey: string): string {
  return `card-field-${fieldKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

/**
 * The left column of the builder: every card-usable catalog field as a checkbox, grouped by
 * source and filterable by name (configurable-product-card Req 9.3, 9.6). Checking a field adds a
 * line to the selected section; unchecking removes it wherever it sits.
 */
export function CardFieldPicker({
  groups,
  enabledKeys,
  excludedKeys,
  atLimit,
  maxFields,
  onToggle,
}: CardFieldPickerProps) {
  const [filter, setFilter] = useState('');
  const enabled = useMemo(() => new Set(enabledKeys), [enabledKeys]);
  const excluded = useMemo(() => new Set(excludedKeys), [excludedKeys]);

  const visibleGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, fields: g.fields.filter((f) => f.label.toLowerCase().includes(q)) }))
      .filter((g) => g.fields.length > 0);
  }, [groups, filter]);

  return (
    <Stack gap="sm">
      <SearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Find a field…"
        showSearchButton={false}
      />
      {atLimit ? (
        <Text as="p" variant="caption" color="secondary" role="status">
          A card can show at most {maxFields} fields. Remove one to add another.
        </Text>
      ) : null}
      {visibleGroups.length === 0 ? (
        <Text variant="caption" color="secondary">
          No fields match “{filter}”.
        </Text>
      ) : null}
      {visibleGroups.map(({ group, title, fields }) => (
        <Box key={group} className={surfaceChrome.cardBuilderFieldGroup}>
          <Text as="p" className={surfaceChrome.profileSectionLabel}>
            {title}
          </Text>
          {fields.map((field) => {
            const isExcluded = excluded.has(field.fieldKey);
            const on = !isExcluded && enabled.has(field.fieldKey);
            const disabled = isExcluded || (atLimit && !on);
            return (
              <Box
                key={field.fieldKey}
                className={cn(
                  surfaceChrome.cardBuilderFieldItem,
                  disabled && surfaceChrome.cardBuilderFieldItemDisabled,
                )}
                title={isExcluded ? 'Not available on this card' : undefined}
              >
                <Checkbox
                  id={checkboxId(field.fieldKey)}
                  label={field.label}
                  checked={on}
                  disabled={disabled}
                  onChange={(e) => onToggle(field.fieldKey, e.target.checked)}
                />
                <Inline gap="xs" align="center">
                  {field.sensitivity === 'SHOP_INTERNAL' ? (
                    <Badge variant="warning">internal</Badge>
                  ) : null}
                  {isExcluded ? <Badge variant="neutral">n/a</Badge> : null}
                </Inline>
              </Box>
            );
          })}
        </Box>
      ))}
    </Stack>
  );
}
