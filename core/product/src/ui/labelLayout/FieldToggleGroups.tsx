import { Box, Switch, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import type { ShopType } from '../../model/labelLayout.types.js';
import { fieldAvailableForShop, type CatalogFieldGroup } from './labelLayoutDraft.js';

export interface FieldToggleGroupsProps {
  groups: CatalogFieldGroup[];
  enabledKeys: string[];
  shopType: ShopType;
  /** When true, every OFF toggle is disabled (sticker line limit reached). */
  atLimit: boolean;
  maxLines: number;
  onToggle(fieldKey: string, on: boolean): void;
}

function toggleId(fieldKey: string): string {
  return `label-field-toggle-${fieldKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

/**
 * One switch per catalog field under a heading per group. Presentational only:
 * the parent owns the draft and receives `onToggle(fieldKey, on)`.
 * Mirrors the toggle chrome used by the Invoice layout tab.
 */
export function FieldToggleGroups({
  groups,
  enabledKeys,
  shopType,
  atLimit,
  maxLines,
  onToggle,
}: FieldToggleGroupsProps) {
  const enabled = new Set(enabledKeys);

  return (
    <Box className={surfaceChrome.invoiceTogglePanel}>
      {atLimit ? (
        <Text
          as="p"
          variant="caption"
          color="secondary"
          role="status"
          className={surfaceChrome.invoiceToggleHint}
        >
          Sticker allows at most {maxLines} lines
        </Text>
      ) : null}

      {groups.map(({ group, title, fields }) => (
        <Box key={group} className={surfaceChrome.invoiceToggleGroup}>
          <Text as="p" className={surfaceChrome.profileSectionLabel}>
            {title}
          </Text>
          <Box className={surfaceChrome.invoiceToggleGrid}>
            {fields.map((field) => {
              const available = fieldAvailableForShop(field, shopType);
              const on = available && enabled.has(field.fieldKey);
              const disabled = !available || (atLimit && !on);
              const hint = available ? null : `Available for: ${field.availableForShopTypes.join(', ')}`;

              return (
                <Switch
                  key={field.fieldKey}
                  id={toggleId(field.fieldKey)}
                  className={surfaceChrome.invoiceToggleItem}
                  aria-label={field.label}
                  label={
                    hint ? (
                      <>
                        {field.label}
                        <Text variant="caption" className={surfaceChrome.invoiceToggleHint}>
                          {hint}
                        </Text>
                      </>
                    ) : (
                      field.label
                    )
                  }
                  checked={on}
                  disabled={disabled}
                  onChange={(e) => onToggle(field.fieldKey, e.target.checked)}
                />
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
