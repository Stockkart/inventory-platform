import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { cartApi, shopMenuApi } from '@inventory-platform/product/api';
import type {
  MenuItem,
  MenuRate,
  MenuSection,
  ShopMenu,
} from '@inventory-platform/plugin-cafe/types';
import { menuSellableRef } from '@inventory-platform/product/types';
import { useNotify, useVerticalSchemaStore } from '@inventory-platform/session';
import {
  Alert,
  Badge,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Icon,
  IconButton,
  Inline,
  Input,
  PageHeader,
  SearchInput,
  Stack,
  Switch,
  Text,
  cn,
  productChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

export function meta() {
  return [{ title: 'Menu - StockKart' }, { name: 'description', content: 'Manage your cafe menu' }];
}

function newId(): string {
  return crypto.randomUUID();
}

function emptyItem(): MenuItem {
  return {
    id: newId(),
    name: '',
    sellingPrice: 0,
    sellMode: 'menu',
    available: true,
  };
}

function emptySection(): MenuSection {
  return {
    id: newId(),
    title: 'New section',
    sortOrder: 0,
    items: [emptyItem()],
  };
}

/**
 * A portion's id is a slug frozen the moment the portion is first named, and never regenerated.
 * It is what rides in the sellable ref (`menu:<itemId>@<rateId>`), so a later rename — "Half" to
 * "Half plate" — must leave it alone or every cart line and kitchen ticket pointing at it is
 * orphaned.
 */
function slugifyPortion(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function freezePortionId(name: string, siblings: MenuRate[]): string {
  const base = slugifyPortion(name) || 'portion';
  let candidate = base;
  let suffix = 2;
  while (siblings.some((r) => r.id === candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** The portions that are real enough to save and to offer on Sell. */
function namedPortions(item: Pick<MenuItem, 'rates'>): MenuRate[] {
  return (item.rates ?? []).filter((r) => r.name.trim());
}

function normalizeSectionsForCompare(sections: MenuSection[]): string {
  return JSON.stringify(
    sections.map((s, idx) => ({
      title: s.title.trim() || 'Untitled',
      sortOrder: idx,
      items: s.items
        .filter((i) => i.name.trim())
        .map((i) => ({
          id: i.id,
          name: i.name.trim(),
          sellingPrice: Number(i.sellingPrice) || 0,
          sellMode: 'menu' as const,
          available: i.available !== false,
          // Must be compared too: without it, editing only the station leaves the menu looking
          // unchanged and Save stays disabled.
          department: (i.department ?? '').trim().toUpperCase(),
          // Same trap, same cost: leave the portions out and a cashier who renames Half or
          // reprices Full finds Save greyed out with their edit sitting on screen.
          rates: namedPortions(i).map((r) => ({
            id: r.id,
            name: r.name.trim(),
            price: Number(r.price) || 0,
          })),
        })),
    })),
  );
}

function menuItemMatchesSearch(item: MenuItem, sectionTitle: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  if (!item.name.trim()) return false;
  return (
    item.name.toLowerCase().includes(normalized) || sectionTitle.toLowerCase().includes(normalized)
  );
}

export function MenuAdminPage() {
  const { success: notifySuccess, error: notifyError } = useNotify;
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const [businessType, setBusinessType] = useState('cafe');
  const [menu, setMenu] = useState<ShopMenu | null>(null);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToSell, setAddingToSell] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const savedSnapshotRef = useRef('');

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const hasActiveSearch = normalizedSearch.length > 0;

  useEffect(() => {
    void fetchShopSchema('regular').then((schema) => {
      if (schema?.verticalId) {
        setBusinessType(schema.verticalId);
      }
    });
  }, [fetchShopSchema]);

  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await shopMenuApi.get();
      setMenu(data);
      const nextSections = data.sections?.length
        ? data.sections.map((s) => ({
            ...s,
            items: s.items?.length ? s.items : [emptyItem()],
          }))
        : [emptySection()];
      setSections(nextSections);
      savedSnapshotRef.current = normalizeSectionsForCompare(nextSections);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load menu';
      setError(message);
      notifyError(message);
    } finally {
      setIsLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      void loadMenu();
    }
  }, [loadMenu]);

  const isDirty = useMemo(
    () => normalizeSectionsForCompare(sections) !== savedSnapshotRef.current,
    [sections],
  );

  const { totalItems, availableItems } = useMemo(() => {
    let total = 0;
    let available = 0;
    for (const section of sections) {
      for (const item of section.items) {
        if (!item.name.trim()) continue;
        total += 1;
        if (item.available !== false) available += 1;
      }
    }
    return { totalItems: total, availableItems: available };
  }, [sections]);

  const displaySections = useMemo(() => {
    if (!hasActiveSearch) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          menuItemMatchesSearch(item, section.title, searchQuery),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, hasActiveSearch, searchQuery]);

  const searchResultCount = useMemo(() => {
    if (!hasActiveSearch) return 0;
    return displaySections.reduce(
      (sum, section) => sum + section.items.filter((item) => item.name.trim()).length,
      0,
    );
  }, [displaySections, hasActiveSearch]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const addToSellDisabledReason = (item: MenuItem): string | null => {
    if (isDirty) return 'Save menu first';
    if (!item.name.trim()) return 'Name required';
    if (item.available === false) return 'Hidden from sell';
    // A portioned item has no one price, and this button cannot ask which portion. The Sell
    // screen's picker can, so send the cashier there rather than guessing a portion for them.
    if (namedPortions(item).length > 0) return 'Pick portion on Sell';
    if (!item.sellingPrice || item.sellingPrice <= 0) return 'Price not set';
    return null;
  };

  const canAddItemToSell = (item: MenuItem): boolean => addToSellDisabledReason(item) === null;

  const handleAddToSell = async (item: MenuItem) => {
    const disabledReason = addToSellDisabledReason(item);
    if (disabledReason) {
      notifyError(disabledReason);
      return;
    }

    setAddingToSell(item.id);
    setError(null);
    try {
      await cartApi.add({
        businessType,
        items: [{ sellableRef: menuSellableRef(item.id), quantity: 1 }],
      });
      notifySuccess(`Added "${item.name.trim()}" to sell cart`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to sell';
      setError(message);
      notifyError(message);
    } finally {
      setAddingToSell(null);
    }
  };

  const updateSection = (sectionId: string, patch: Partial<MenuSection>) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));
  };

  const updateItem = (sectionId: string, itemId: string, patch: Partial<MenuItem>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: s.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            },
      ),
    );
  };

  const addItem = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, emptyItem()] } : s)),
    );
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const next = s.items.filter((i) => i.id !== itemId);
        return { ...s, items: next.length ? next : [emptyItem()] };
      }),
    );
  };

  const updatePortions = (
    sectionId: string,
    itemId: string,
    change: (rates: MenuRate[]) => MenuRate[],
  ) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: s.items.map((item) =>
                item.id === itemId ? { ...item, rates: change(item.rates ?? []) } : item,
              ),
            },
      ),
    );
  };

  const addPortion = (sectionId: string, itemId: string) => {
    updatePortions(sectionId, itemId, (rates) => [...rates, { id: '', name: '', price: 0 }]);
  };

  const removePortion = (sectionId: string, itemId: string, index: number) => {
    updatePortions(sectionId, itemId, (rates) => rates.filter((_, i) => i !== index));
  };

  const renamePortion = (sectionId: string, itemId: string, index: number, name: string) => {
    updatePortions(sectionId, itemId, (rates) =>
      rates.map((rate, i) => {
        if (i !== index) return rate;
        // Freeze the id on the first real name and never touch it again, so renaming later
        // changes only what the shop reads — not what the cart and the kitchen point at.
        const id =
          rate.id ||
          (name.trim()
            ? freezePortionId(
                name,
                rates.filter((_, j) => j !== index),
              )
            : '');
        return { ...rate, id, name };
      }),
    );
  };

  const repricePortion = (sectionId: string, itemId: string, index: number, price: string) => {
    updatePortions(sectionId, itemId, (rates) =>
      rates.map((rate, i) => (i === index ? { ...rate, price: Number(price) || 0 } : rate)),
    );
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sectionId);
      return next.length ? next : [emptySection()];
    });
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
  };

  const toggleSectionCollapsed = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const cleaned: MenuSection[] = sections
        .map((s, idx) => ({
          ...s,
          sortOrder: idx,
          title: s.title.trim() || 'Untitled',
          items: s.items
            .filter((i) => i.name.trim())
            .map((i) => {
              const rates = namedPortions(i).map((r) => ({
                id: r.id || freezePortionId(r.name, []),
                name: r.name.trim(),
                price: Number(r.price) || 0,
              }));
              return {
                ...i,
                name: i.name.trim(),
                // One or the other, never both: a portioned item's price lives in its portions.
                sellingPrice: rates.length ? null : Number(i.sellingPrice) || 0,
                rates,
                sellMode: 'menu' as const,
                inventoryId: null,
              };
            }),
        }))
        .filter((s) => s.items.length > 0);

      const payload: ShopMenu = {
        revision: menu?.revision ?? 0,
        sections: cleaned.length ? cleaned : [emptySection()],
      };

      const saved = await shopMenuApi.put(payload);
      setMenu(saved);
      const savedSections = saved.sections ?? cleaned;
      setSections(savedSections);
      savedSnapshotRef.current = normalizeSectionsForCompare(savedSections);
      setSavedMessage('Menu saved successfully.');
      notifySuccess('Menu saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save menu';
      setError(message);
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Stack gap="md" className={productChrome.menuAdminShell}>
        <CenteredLoader label="Loading menu…" />
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={productChrome.menuAdminShell}>
      <PageHeader
        description="Organize sellable items into sections. Prices set here appear on Sell."
        actions={
          <Inline gap="sm" flexWrap>
            {isDirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setSections((prev) => [...prev, emptySection()])}
            >
              + Add section
            </Button>
            <Button
              type="button"
              variant="solid"
              disabled={isSaving || !isDirty}
              onClick={() => void handleSave()}
              loading={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save menu'}
            </Button>
          </Inline>
        }
      />

      <Box className={productChrome.menuAdminStats}>
        <Box as="span" className={productChrome.menuAdminStat}>
          <Box as="span" className={productChrome.menuAdminStatValue}>
            {sections.length}
          </Box>
          {sections.length === 1 ? 'section' : 'sections'}
        </Box>
        <Box as="span" className={productChrome.menuAdminStat}>
          <Box as="span" className={productChrome.menuAdminStatValue}>
            {totalItems}
          </Box>
          {totalItems === 1 ? 'item' : 'items'}
        </Box>
        <Box as="span" className={productChrome.menuAdminStat}>
          <Icon icon={Check} size="sm" />
          <Box as="span" className={productChrome.menuAdminStatValue}>
            {availableItems}
          </Box>
          available
        </Box>
      </Box>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {savedMessage ? <Alert variant="success">{savedMessage}</Alert> : null}

      <Box className={surfaceChrome.searchFilterBar}>
        <Box className={surfaceChrome.searchFilterGrow}>
          <SearchInput
            grow
            flush
            buttonVariant="solid"
            leadingIcon={<Icon icon={Search} size="sm" />}
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search menu items or sections…"
            showSearchButton={false}
          />
        </Box>
        {hasActiveSearch ? (
          <>
            <Box className={surfaceChrome.searchFilterDivider} aria-hidden />
            <Button type="button" variant="ghost" size="sm" onClick={handleClearSearch}>
              Clear
            </Button>
          </>
        ) : null}
      </Box>
      {hasActiveSearch ? (
        <Text variant="caption" color="secondary">
          {searchResultCount} {searchResultCount === 1 ? 'match' : 'matches'} for &ldquo;
          {searchQuery.trim()}&rdquo;
        </Text>
      ) : null}

      {sections.length === 0 ? (
        <EmptyState
          title="No menu sections yet"
          description="Create a section for mains, beverages, or combos."
          action={
            <Button type="button" variant="solid" onClick={() => setSections([emptySection()])}>
              Create first section
            </Button>
          }
        />
      ) : hasActiveSearch && displaySections.length === 0 ? (
        <EmptyState
          title="No menu items found"
          description="Try a different name or section, or clear the search."
          action={
            <Button type="button" variant="solid" onClick={handleClearSearch}>
              Clear search
            </Button>
          }
        />
      ) : (
        <Box className={productChrome.menuAdminSections}>
          {displaySections.map((section) => {
            const isCollapsed = !hasActiveSearch && collapsedSections.has(section.id);
            const namedItems = section.items.filter((i) => i.name.trim());
            const sectionTitle = section.title.trim() || 'section';
            return (
              <Box key={section.id} className={productChrome.menuAdminSection}>
                <Box className={productChrome.menuAdminSectionHeader}>
                  <IconButton
                    size="sm"
                    label={isCollapsed ? 'Expand section' : 'Collapse section'}
                    onClick={() => toggleSectionCollapsed(section.id)}
                  >
                    <Icon icon={isCollapsed ? ChevronRight : ChevronDown} size="sm" />
                  </IconButton>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    placeholder="Section title (e.g. Main course)"
                    className={productChrome.menuAdminSectionTitle}
                  />
                  <Badge variant="neutral">
                    {namedItems.length || section.items.length}{' '}
                    {(namedItems.length || section.items.length) === 1 ? 'item' : 'items'}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={productChrome.menuAdminDeleteSection}
                    onClick={() => removeSection(section.id)}
                  >
                    Delete
                  </Button>
                </Box>

                {!isCollapsed ? (
                  <Box className={productChrome.menuAdminSectionBody}>
                    <Box className={productChrome.menuAdminItemGrid}>
                      {section.items.map((item) => {
                        const isAvailable = item.available !== false;
                        const portions = item.rates ?? [];
                        const isPortioned = namedPortions(item).length > 0;
                        return (
                          <Box
                            key={item.id}
                            className={cn(
                              productChrome.menuAdminItem,
                              !isAvailable && productChrome.menuAdminItemUnavailable,
                            )}
                          >
                            <Inline gap="sm" align="start" width="full">
                              <Input
                                value={item.name}
                                onChange={(e) =>
                                  updateItem(section.id, item.id, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Item name"
                                className={productChrome.menuAdminItemName}
                              />
                              <IconButton
                                size="sm"
                                label="Remove item"
                                title="Remove item"
                                onClick={() => removeItem(section.id, item.id)}
                              >
                                ×
                              </IconButton>
                            </Inline>

                            {isPortioned ? null : (
                              <Box className={productChrome.menuAdminItemPriceRow}>
                                <Text as="span" className={productChrome.menuAdminItemPricePrefix}>
                                  ₹
                                </Text>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={item.sellingPrice || ''}
                                  onChange={(e) =>
                                    updateItem(section.id, item.id, {
                                      sellingPrice: Number(e.target.value),
                                    })
                                  }
                                  placeholder="0.00"
                                  className={productChrome.menuAdminItemPrice}
                                  aria-label="Price"
                                />
                              </Box>
                            )}

                            {/*
                              Portions are named and priced here exactly as custom rates are on
                              the pricing screen: a row of name + price, added and removed one at
                              a time. An item is priced one way or the other — once a portion is
                              named, the single price above steps aside.
                            */}
                            <Box className={productChrome.menuAdminPortionSection}>
                              <Box className={productChrome.menuAdminPortionHead}>
                                <Text as="span" className={productChrome.menuAdminItemPricePrefix}>
                                  Portions
                                </Text>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addPortion(section.id, item.id)}
                                >
                                  Add portion
                                </Button>
                              </Box>
                              {portions.length === 0 ? (
                                <Text as="p" className={productChrome.menuAdminPortionHint}>
                                  None — this item sells at the single price above. Add Qtr, Half or
                                  Full to price it by portion instead.
                                </Text>
                              ) : (
                                <>
                                  {portions.map((rate, i) => (
                                    <Box
                                      key={rate.id || `new-${i}`}
                                      className={productChrome.menuAdminPortionRow}
                                    >
                                      <Input
                                        value={rate.name}
                                        onChange={(e) =>
                                          renamePortion(section.id, item.id, i, e.target.value)
                                        }
                                        placeholder="e.g. Half"
                                        aria-label={`Portion ${i + 1} name for ${
                                          item.name.trim() || 'new item'
                                        }`}
                                      />
                                      <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={rate.price || ''}
                                        onChange={(e) =>
                                          repricePortion(section.id, item.id, i, e.target.value)
                                        }
                                        placeholder="0.00"
                                        className={productChrome.menuAdminPortionPrice}
                                        aria-label={`Portion ${i + 1} price for ${
                                          item.name.trim() || 'new item'
                                        }`}
                                      />
                                      <IconButton
                                        size="sm"
                                        label={`Remove portion ${rate.name.trim() || i + 1}`}
                                        onClick={() => removePortion(section.id, item.id, i)}
                                      >
                                        ×
                                      </IconButton>
                                    </Box>
                                  ))}
                                </>
                              )}
                            </Box>

                            <Box className={productChrome.menuAdminItemPriceRow}>
                              <Text as="span" className={productChrome.menuAdminItemPricePrefix}>
                                Station
                              </Text>
                              <Input
                                value={item.department ?? ''}
                                onChange={(e) =>
                                  updateItem(section.id, item.id, {
                                    department: e.target.value,
                                  })
                                }
                                placeholder="KITCHEN"
                                className={productChrome.menuAdminItemDepartment}
                                aria-label="Kitchen station"
                                title="Which counter makes this item. Blank routes it to the kitchen."
                              />
                            </Box>

                            <Box className={productChrome.menuAdminItemMeta}>
                              <Text as="span" className={productChrome.menuAdminItemMetaLabel}>
                                {isAvailable ? 'Available' : 'Hidden'}
                              </Text>
                              <Switch
                                label={isAvailable ? 'Mark unavailable' : 'Mark available'}
                                checked={isAvailable}
                                onChange={() =>
                                  updateItem(section.id, item.id, {
                                    available: !isAvailable,
                                  })
                                }
                                aria-pressed={isAvailable}
                              />
                            </Box>

                            <Button
                              type="button"
                              variant="solid"
                              size="sm"
                              fullWidth
                              onClick={() => void handleAddToSell(item)}
                              disabled={!canAddItemToSell(item) || addingToSell === item.id}
                              title={addToSellDisabledReason(item) ?? undefined}
                            >
                              {addingToSell === item.id
                                ? 'Adding…'
                                : addToSellDisabledReason(item) ?? 'Add to Sell'}
                            </Button>
                          </Box>
                        );
                      })}
                    </Box>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={productChrome.menuAdminAddItem}
                      onClick={() => addItem(section.id)}
                    >
                      + Add item to {sectionTitle}
                    </Button>
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
