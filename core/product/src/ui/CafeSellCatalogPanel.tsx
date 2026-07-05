import { useMemo, useState } from 'react';
import type { InventoryItem } from '@inventory-platform/product/types';
import type { MenuItem, SellCatalog } from '@inventory-platform/product/types';
import styles from './CafeSellCatalogPanel.module.css';

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
    [sections, normalizedFilter]
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
    [directStock, normalizedFilter]
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

  const resolvedTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : 'all';

  const showStock = resolvedTab === 'all' || resolvedTab === '__stock__';

  const menuSectionsToRender =
    resolvedTab === 'all'
      ? visibleSections
      : visibleSections.filter((section) => section.id === resolvedTab);

  const hasMenu = visibleSections.length > 0;
  const hasDirectStock = filteredDirectStock.length > 0;

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>Loading menu…</div>
      </div>
    );
  }

  if (!hasMenu && !hasDirectStock) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          {normalizedFilter
            ? 'No items match your search'
            : 'No menu items yet. Add items in Menu admin.'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {tabs.length > 1 && (
        <div
          className={styles.tabBar}
          role="tablist"
          aria-label="Menu categories"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={resolvedTab === tab.id}
              className={`${styles.tab} ${
                resolvedTab === tab.id ? styles.tabActive : ''
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.scrollArea}>
        {menuSectionsToRender.map((section) => (
          <section key={section.id} className={styles.section}>
            <div className={styles.sectionHead}>
              <h4 className={styles.sectionTitle}>{section.title || 'Menu'}</h4>
              <span className={styles.sectionCount}>
                {section.items.length}
              </span>
            </div>
            <div className={styles.grid}>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.tile}
                  disabled={disabled}
                  onClick={() => onAddMenuItem(item)}
                >
                  <span className={styles.tileName}>{item.name}</span>
                  <span className={styles.tileFooter}>
                    <span className={styles.tilePrice}>
                      {money(item.sellingPrice)}
                    </span>
                    <span className={styles.tileAdd} aria-hidden>
                      +
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {showStock && hasDirectStock && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h4 className={styles.sectionTitle}>Direct stock</h4>
              <span className={styles.sectionCount}>
                {filteredDirectStock.length}
              </span>
            </div>
            <div className={styles.grid}>
              {filteredDirectStock.map((item) => {
                const available = stockAvailable(item);
                const outOfStock = available <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.tile} ${styles.tileStock}`}
                    disabled={disabled || outOfStock}
                    onClick={() => onAddDirectStock(item)}
                  >
                    <span className={styles.tileName}>{item.name}</span>
                    <span className={styles.tileMeta}>
                      {outOfStock ? 'Out of stock' : `${available} in stock`}
                    </span>
                    <span className={styles.tileFooter}>
                      <span className={styles.tilePrice}>
                        {money(stockPrice(item))}
                      </span>
                      <span className={styles.tileAdd} aria-hidden>
                        +
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
