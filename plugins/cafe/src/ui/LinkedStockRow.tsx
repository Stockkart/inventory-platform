import type { InventoryItem } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  IconButton,
  Inline,
  Switch,
  Text,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';
import type { MenuItem } from '../types/menu';
import { StationSelect } from './StationSelect';

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

export interface LinkedStockRowProps {
  item: MenuItem;
  /** The placed lot, or null when it was deleted or is no longer sell-direct. */
  lot: InventoryItem | null;
  knownStations: string[];
  onChange: (patch: Partial<MenuItem>) => void;
  onRemove: () => void;
}

/**
 * A stock lot placed in a section. Only placement is edited here — station and availability. Price
 * and stock belong to the lot and are shown read-only, so the menu never prices a lot twice.
 */
export function LinkedStockRow({
  item,
  lot,
  knownStations,
  onChange,
  onRemove,
}: LinkedStockRowProps) {
  const isAvailable = item.available !== false;
  const name = lot?.name || item.name;
  return (
    <Box
      className={cn(
        productChrome.menuAdminItem,
        !isAvailable && productChrome.menuAdminItemUnavailable,
      )}
    >
      <Inline gap="sm" align="center" width="full" justify="between">
        <Inline gap="sm" align="center">
          <Text weight="semibold">{name}</Text>
          <Badge variant="neutral">Stock</Badge>
        </Inline>
        <IconButton size="sm" label={`Remove ${name}`} title="Remove from menu" onClick={onRemove}>
          ×
        </IconButton>
      </Inline>

      {lot ? (
        <Inline gap="sm" align="center">
          <Text weight="semibold">{money(lot.sellingPrice ?? lot.priceToRetail ?? 0)}</Text>
          <Text variant="caption" color="secondary">
            {`${lot.currentBaseCount ?? lot.currentCount ?? 0} in stock`}
          </Text>
        </Inline>
      ) : (
        <Text variant="caption" color="secondary">
          Stock item missing
        </Text>
      )}

      <Box className={productChrome.menuAdminItemPriceRow}>
        <Text as="span" className={productChrome.menuAdminItemPricePrefix}>
          Station
        </Text>
        <StationSelect
          value={item.department ?? ''}
          knownStations={knownStations}
          ariaLabel={`Station for ${name}`}
          onChange={(next) => onChange({ department: next })}
        />
      </Box>

      <Box className={productChrome.menuAdminItemMeta}>
        <Text as="span" className={productChrome.menuAdminItemMetaLabel}>
          {isAvailable ? 'Available' : 'Hidden'}
        </Text>
        <Switch
          label={isAvailable ? 'Mark unavailable' : 'Mark available'}
          checked={isAvailable}
          onChange={() => onChange({ available: !isAvailable })}
          aria-pressed={isAvailable}
        />
      </Box>
    </Box>
  );
}
