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

const panelShellStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const catalogGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
  gap: '0.7rem',
};

const tileBaseStyle: React.CSSProperties = {
  minHeight: '92px',
  textAlign: 'left',
  borderLeft: '3px solid #3b82f6',
};

const tileStockStyle: React.CSSProperties = {
  ...tileBaseStyle,
  borderLeftColor: '#22c55e',
};

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
      <Box padding="lg" border rounded="lg" bg="elevated" style={panelShellStyle}>
        <CenteredLoader label="Loading menu…" />
      </Box>
    );
  }

  if (!hasMenu && !hasDirectStock) {
    return (
      <Box padding="lg" border rounded="lg" bg="elevated" style={panelShellStyle}>
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
    <Stack gap="none" border rounded="lg" bg="elevated" style={panelShellStyle}>
      {tabs.length > 1 ? (
        <Inline
          gap="xs"
          padding="sm"
          bg="surface"
          style={{
            flexShrink: 0,
            overflowX: 'auto',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
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
                style={
                  isActive ? { borderRadius: '999px' } : { borderRadius: '999px', flexShrink: 0 }
                }
              >
                {tab.label}
              </Button>
            );
          })}
        </Inline>
      ) : null}

      <Box
        padding="md"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        {menuSectionsToRender.map((section) => (
          <Box key={section.id} style={{ marginBottom: '1.4rem' }}>
            <Inline justify="between" align="center" gap="sm" style={{ marginBottom: '0.7rem' }}>
              <Text
                variant="caption"
                weight="bold"
                color="secondary"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                {section.title || 'Menu'}
              </Text>
              <Badge variant="neutral">{section.items.length}</Badge>
            </Inline>
            <Box style={catalogGridStyle}>
              {section.items.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onAddMenuItem(item)}
                  style={tileBaseStyle}
                >
                  <Stack gap="xs" width="full">
                    <Text weight="semibold" truncate>
                      {item.name}
                    </Text>
                    <Inline justify="between" align="center" width="full">
                      <Text weight="semibold">{money(item.sellingPrice)}</Text>
                      <Text
                        aria-hidden
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: 'var(--primary-color, #2563eb)',
                          fontWeight: 700,
                        }}
                      >
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
            <Inline justify="between" align="center" gap="sm" style={{ marginBottom: '0.7rem' }}>
              <Text
                variant="caption"
                weight="bold"
                color="secondary"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Direct stock
              </Text>
              <Badge variant="neutral">{filteredDirectStock.length}</Badge>
            </Inline>
            <Box style={catalogGridStyle}>
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
                    style={tileStockStyle}
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
                        <Text
                          aria-hidden
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.14)',
                            color: '#16a34a',
                            fontWeight: 700,
                          }}
                        >
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
