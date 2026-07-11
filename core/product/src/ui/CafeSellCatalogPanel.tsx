import { useMemo, useState } from 'react';
import type { InventoryItem } from '@inventory-platform/product/types';
import type { MenuItem, SellCatalog } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Inline,
  Stack,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

type CafeTab = { id: string; label: string; kind: 'all' | 'menu' | 'stock' };

export interface CafeSellCatalogPanelProps {
  catalog: SellCatalog | null;
  loading?: boolean;
  disabled?: boolean;
  filterQuery?: string;
  onAddMenuItem: (item: MenuItem) => void;
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
              {section.items.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onAddMenuItem(item)}
                  className={productChrome.cafeCatalogTile}
                >
                  <Stack gap="xs" width="full">
                    <Text weight="semibold" truncate>
                      {item.name}
                    </Text>
                    <Inline justify="between" align="center" width="full">
                      <Text weight="semibold">{money(item.sellingPrice)}</Text>
                      <Text aria-hidden className={productChrome.cafeCatalogAddBadge}>
                        +
                      </Text>
                    </Inline>
                  </Stack>
                </Button>
              ))}
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
    </Stack>
  );
}
