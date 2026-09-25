import { useMemo, useState } from 'react';
import type { InventoryItem } from '@inventory-platform/product/types';
import type { MenuItem, MenuRate, SellCatalog } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Inline,
  Modal,
  Stack,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

type CafeTab = { id: string; label: string; kind: 'all' | 'menu' | 'stock' };

/**
 * The portions a cashier may actually pick: a row with no frozen id or no name is a half-typed
 * menu row, and offering it would put a ref on the wire that resolves to nothing.
 */
export function sellablePortions(item: MenuItem): MenuRate[] {
  return (item.rates ?? []).filter((rate) => rate.id?.trim() && rate.name?.trim());
}

function portionPriceRange(portions: MenuRate[]): string {
  const prices = portions.map((rate) => Number(rate.price) || 0);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? money(low) : `${money(low)} – ${money(high)}`;
}

export interface CafeSellCatalogPanelProps {
  catalog: SellCatalog | null;
  loading?: boolean;
  disabled?: boolean;
  filterQuery?: string;
  /**
   * Called with the portion the cashier chose, or with no portion for an unportioned item. A
   * portioned item never reaches here without one: the picker is the only way in.
   */
  onAddMenuItem: (item: MenuItem, rate?: MenuRate) => void;
  onAddDirectStock: (item: InventoryItem) => void;
}

function stockPrice(item: InventoryItem): number {
  return item.sellingPrice ?? item.priceToRetail ?? 0;
}

function stockAvailable(item: InventoryItem): number {
  return item.currentBaseCount ?? item.currentCount ?? 0;
}

export function CafeSellCatalogPanel({
  catalog,
  loading = false,
  disabled = false,
  filterQuery = '',
  onAddMenuItem,
  onAddDirectStock,
}: CafeSellCatalogPanelProps) {
  const sections = catalog?.menu?.sections ?? [];
  const directStock = catalog?.directStock ?? [];
  const normalizedFilter = filterQuery.trim().toLowerCase();

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: (section.items ?? []).filter((item) => {
            if (item.available === false || !item.name?.trim()) {
              return false;
            }
            if (!normalizedFilter) {
              return true;
            }
            return item.name.toLowerCase().includes(normalizedFilter);
          }),
        }))
        .filter((section) => section.items.length > 0),
    [sections, normalizedFilter],
  );

  const filteredDirectStock = useMemo(
    () =>
      directStock.filter((item) => {
        if (!item.name?.trim()) {
          return false;
        }
        if (!normalizedFilter) {
          return true;
        }
        return item.name.toLowerCase().includes(normalizedFilter);
      }),
    [directStock, normalizedFilter],
  );

  const tabs = useMemo((): CafeTab[] => {
    const next: CafeTab[] = [{ id: 'all', label: 'All', kind: 'all' }];
    for (const section of visibleSections) {
      next.push({
        id: section.id,
        label: section.title || 'Menu',
        kind: 'menu',
      });
    }
    if (filteredDirectStock.length > 0) {
      next.push({ id: '__stock__', label: 'Stock', kind: 'stock' });
    }
    return next;
  }, [visibleSections, filteredDirectStock.length]);

  const [activeTab, setActiveTab] = useState('all');
  /** The item whose portion picker is open. Null means no picker. */
  const [portionItem, setPortionItem] = useState<MenuItem | null>(null);
  const openPortions = portionItem ? sellablePortions(portionItem) : [];

  const resolvedTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'all';

  const showStock = resolvedTab === 'all' || resolvedTab === '__stock__';

  const menuSectionsToRender =
    resolvedTab === 'all'
      ? visibleSections
      : visibleSections.filter((section) => section.id === resolvedTab);

  const hasMenu = visibleSections.length > 0;
  const hasDirectStock = filteredDirectStock.length > 0;

  if (loading) {
    return (
      <Box
        padding="lg"
        border
        rounded="lg"
        bg="elevated"
        className={productChrome.cafeCatalogShell}
      >
        <CenteredLoader label="Loading menu…" />
      </Box>
    );
  }

  if (!hasMenu && !hasDirectStock) {
    return (
      <Box
        padding="lg"
        border
        rounded="lg"
        bg="elevated"
        className={productChrome.cafeCatalogShell}
      >
        <EmptyState
          title={
            normalizedFilter
              ? 'No items match your search'
              : 'No menu items yet. Add items in Menu admin.'
          }
        />
      </Box>
    );
  }

  return (
    <Stack gap="none" border rounded="lg" bg="elevated" className={productChrome.cafeCatalogShell}>
      {tabs.length > 1 ? (
        <Inline gap="xs" padding="sm" bg="surface" className={productChrome.cafeCatalogTabs}>
          {tabs.map((tab) => {
            const isActive = resolvedTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant={isActive ? 'solid' : 'ghost'}
                size="sm"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={productChrome.cafeCatalogTab}
              >
                {tab.label}
              </Button>
            );
          })}
        </Inline>
      ) : null}

      <Box padding="md" className={productChrome.cafeCatalogScroll}>
        {menuSectionsToRender.map((section) => (
          <Box key={section.id} className={productChrome.cafeCatalogSection}>
            <Inline
              justify="between"
              align="center"
              gap="sm"
              className={productChrome.cafeCatalogSectionHeader}
            >
              <Text
                variant="caption"
                weight="bold"
                color="secondary"
                className={productChrome.sectionLabel}
              >
                {section.title || 'Menu'}
              </Text>
              <Badge variant="neutral">{section.items.length}</Badge>
            </Inline>
            <Box className={productChrome.cafeCatalogGrid}>
              {section.items.map((item) => {
                const portions = sellablePortions(item);
                const isPortioned = portions.length > 0;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => (isPortioned ? setPortionItem(item) : onAddMenuItem(item))}
                    className={
                      isPortioned
                        ? productChrome.cafeCatalogTilePortioned
                        : productChrome.cafeCatalogTile
                    }
                  >
                    <Stack gap="xs" width="full">
                      <Text weight="semibold" truncate>
                        {item.name}
                      </Text>
                      <Inline justify="between" align="center" width="full">
                        <Text weight="semibold">
                          {isPortioned
                            ? portionPriceRange(portions)
                            : money(item.sellingPrice ?? 0)}
                        </Text>
                        <Text aria-hidden className={productChrome.cafeCatalogAddBadge}>
                          +
                        </Text>
                      </Inline>
                      {isPortioned ? (
                        <Text className={productChrome.cafeCatalogTileHint}>
                          {portions.length} portions
                        </Text>
                      ) : null}
                    </Stack>
                  </Button>
                );
              })}
            </Box>
          </Box>
        ))}

        {showStock && hasDirectStock ? (
          <Box>
            <Inline
              justify="between"
              align="center"
              gap="sm"
              className={productChrome.cafeCatalogSectionHeader}
            >
              <Text
                variant="caption"
                weight="bold"
                color="secondary"
                className={productChrome.sectionLabel}
              >
                Direct stock
              </Text>
              <Badge variant="neutral">{filteredDirectStock.length}</Badge>
            </Inline>
            <Box className={productChrome.cafeCatalogGrid}>
              {filteredDirectStock.map((item) => {
                const available = stockAvailable(item);
                const outOfStock = available <= 0;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    disabled={disabled || outOfStock}
                    onClick={() => onAddDirectStock(item)}
                    className={productChrome.cafeCatalogTileStock}
                  >
                    <Stack gap="xs" width="full">
                      <Text weight="semibold" truncate>
                        {item.name}
                      </Text>
                      <Text variant="caption" color="secondary">
                        {outOfStock ? 'Out of stock' : `${available} in stock`}
                      </Text>
                      <Inline justify="between" align="center" width="full">
                        <Text weight="semibold">{money(stockPrice(item))}</Text>
                        <Text aria-hidden className={productChrome.cafeCatalogAddBadgeStock}>
                          +
                        </Text>
                      </Inline>
                    </Stack>
                  </Button>
                );
              })}
            </Box>
          </Box>
        ) : null}
      </Box>

      {/*
        The picker is the only way a portioned item enters the cart. Each row carries its own
        price beside its own name: a cashier reading "Half" next to a range would have to guess
        which half of the range it is, and a guess at the counter becomes a wrong bill.
      */}
      <Modal open={portionItem !== null} onClose={() => setPortionItem(null)} size="sm">
        <Modal.Header
          title={portionItem ? `Choose portion — ${portionItem.name}` : 'Choose portion'}
        />
        <Modal.Body>
          <Box className={productChrome.cafeCatalogPortionList}>
            {openPortions.map((rate) => (
              <Button
                key={rate.id}
                type="button"
                variant="outline"
                disabled={disabled}
                className={productChrome.cafeCatalogPortionRow}
                onClick={() => {
                  if (!portionItem) return;
                  const item = portionItem;
                  setPortionItem(null);
                  onAddMenuItem(item, rate);
                }}
              >
                <Inline justify="between" align="center" width="full" gap="md">
                  <Text weight="semibold">{rate.name}</Text>
                  <Text weight="semibold" className={productChrome.cafeCatalogPortionPrice}>
                    {money(Number(rate.price) || 0)}
                  </Text>
                </Inline>
              </Button>
            ))}
          </Box>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={() => setPortionItem(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
