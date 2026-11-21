import { ArrowDown, ArrowUp, X } from 'lucide-react';
import {
  Badge,
  Box,
  IconButton,
  Inline,
  Select,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { LabelZone, StickerTemplate } from '../../model/labelLayout.types.js';

export interface EnabledFieldOrderItem {
  fieldKey: string;
  label: string;
  /** Saved key the catalog no longer knows about; shown with a badge and excluded from print. */
  unavailable: boolean;
}

/** The three label-mode choices shown per row under the `COMPACT` template (Req 11.10). */
export type LabelMode = 'auto' | 'show' | 'hide';

export interface EnabledFieldOrderListProps {
  items: EnabledFieldOrderItem[];
  onMove(index: number, dir: 'up' | 'down'): void;
  onRemove(fieldKey: string): void;
  /**
   * Active sticker template (Req 11). When `COMPACT`, each row shows a zone and a
   * label-mode selector. Optional and defaulting to `STACKED` so existing callers
   * keep compiling and rendering as before.
   */
  template?: StickerTemplate;
  /** Current per-field zone assignments (`fieldZones`); absent key resolves to `LEFT`. */
  fieldZones?: Record<string, LabelZone>;
  /** Current per-field label overrides (`fieldLabelOverrides`); absent key is `Auto`. */
  fieldLabelOverrides?: Record<string, boolean>;
  /** Called when a row's zone selector changes (only used under `COMPACT`). */
  onZoneChange?(fieldKey: string, zone: LabelZone): void;
  /** Called when a row's label-mode selector changes: `auto`→undefined, `show`→true, `hide`→false. */
  onLabelModeChange?(fieldKey: string, override: boolean | undefined): void;
}

const ZONE_OPTIONS: ReadonlyArray<{ value: LabelZone; label: string }> = [
  { value: 'HEADER', label: 'Header' },
  { value: 'LEFT', label: 'Left' },
  { value: 'RIGHT', label: 'Right' },
];

const LABEL_MODE_OPTIONS: ReadonlyArray<{ value: LabelMode; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
];

/** Maps a stored override (`undefined`/`true`/`false`) to its label-mode select value. */
export function labelModeFor(override: boolean | undefined): LabelMode {
  if (override === undefined) return 'auto';
  return override ? 'show' : 'hide';
}

/** Maps a label-mode select value back to the stored override. */
export function overrideForLabelMode(mode: LabelMode): boolean | undefined {
  if (mode === 'show') return true;
  if (mode === 'hide') return false;
  return undefined;
}

/**
 * Ordered list of the enabled fields in print order with keyboard-operable
 * move-up / move-down / remove buttons. Presentational only.
 */
export function EnabledFieldOrderList({
  items,
  onMove,
  onRemove,
  template = 'STACKED',
  fieldZones,
  fieldLabelOverrides,
  onZoneChange,
  onLabelModeChange,
}: EnabledFieldOrderListProps) {
  const compact = template === 'COMPACT';

  if (items.length === 0) {
    return (
      <Text as="p" variant="caption" color="secondary">
        No fields enabled. Turn on a field above to print it.
      </Text>
    );
  }

  return (
    <Box
      as="ol"
      className={surfaceChrome.listPlain}
      aria-label="Enabled fields in print order"
      padding="none"
      margin="none"
    >
      {items.map((item, index) => {
        const first = index === 0;
        const last = index === items.length - 1;
        return (
          <Box
            key={item.fieldKey}
            as="li"
            display="flex"
            align="center"
            justify="between"
            gap="sm"
            py="xs"
            borderBottom={!last}
          >
            <Inline gap="sm" align="center">
              <Text
                as="span"
                variant="caption"
                color="secondary"
                className={surfaceChrome.tabularNums}
              >
                {index + 1}.
              </Text>
              <Text as="span">{item.label}</Text>
              {item.unavailable ? <Badge variant="warning">No longer available</Badge> : null}
            </Inline>
            <Inline gap="xs" align="center">
              {compact && !item.unavailable ? (
                <>
                  <Select
                    aria-label={`Zone for ${item.label}`}
                    className={surfaceChrome.minW7_5}
                    value={fieldZones?.[item.fieldKey] ?? 'LEFT'}
                    options={ZONE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={(e) => onZoneChange?.(item.fieldKey, e.target.value as LabelZone)}
                  />
                  <Select
                    aria-label={`Label mode for ${item.label}`}
                    className={surfaceChrome.minW7_5}
                    value={labelModeFor(fieldLabelOverrides?.[item.fieldKey])}
                    options={LABEL_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={(e) =>
                      onLabelModeChange?.(
                        item.fieldKey,
                        overrideForLabelMode(e.target.value as LabelMode),
                      )
                    }
                  />
                </>
              ) : null}
              <IconButton
                size="sm"
                label={`Move ${item.label} up`}
                disabled={first}
                onClick={() => onMove(index, 'up')}
              >
                <ArrowUp size={14} />
              </IconButton>
              <IconButton
                size="sm"
                label={`Move ${item.label} down`}
                disabled={last}
                onClick={() => onMove(index, 'down')}
              >
                <ArrowDown size={14} />
              </IconButton>
              <IconButton
                size="sm"
                label={`Remove ${item.label}`}
                onClick={() => onRemove(item.fieldKey)}
              >
                <X size={14} />
              </IconButton>
            </Inline>
          </Box>
        );
      })}
    </Box>
  );
}
