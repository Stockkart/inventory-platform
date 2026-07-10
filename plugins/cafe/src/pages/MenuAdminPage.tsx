import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cartApi, shopMenuApi } from '@inventory-platform/product/api';
import type { MenuItem, MenuSection, ShopMenu } from '@inventory-platform/plugin-cafe/types';
import { menuSellableRef } from '@inventory-platform/product/types';
import { useNotify, useVerticalSchemaStore } from '@inventory-platform/session';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CenteredLoader,
  Divider,
  EmptyState,
  FormField,
  IconButton,
  Inline,
  Input,
  PageHeader,
  SearchInput,
  Stack,
  Switch,
  Text,
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

const unavailableCardStyle = { opacity: 0.72 };

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

  const canAddItemToSell = (item: MenuItem): boolean => {
    if (isDirty) return false;
    if (!item.name.trim()) return false;
    if (item.available === false) return false;
    if (!item.sellingPrice || item.sellingPrice <= 0) return false;
    return true;
  };

  const addToSellDisabledReason = (item: MenuItem): string | null => {
    if (isDirty) return 'Save menu first';
    if (!item.name.trim()) return 'Name required';
    if (item.available === false) return 'Hidden from sell';
    if (!item.sellingPrice || item.sellingPrice <= 0) return 'Price not set';
    return null;
  };

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
            .map((i) => ({
              ...i,
              name: i.name.trim(),
              sellingPrice: Number(i.sellingPrice) || 0,
              sellMode: 'menu' as const,
              inventoryId: null,
            })),
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
      <Stack gap="md" width="full" maxWidth="xl" mx="auto" padding="md">
        <CenteredLoader label="Loading menu…" />
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto" padding="md">
      <PageHeader
        title="Menu"
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

      <Inline gap="sm" flexWrap>
        <Badge variant="neutral">
          📂 {sections.length} {sections.length === 1 ? 'section' : 'sections'}
        </Badge>
        <Badge variant="neutral">
          🍽️ {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </Badge>
        <Badge variant="neutral">✓ {availableItems} available</Badge>
      </Inline>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {savedMessage ? <Alert variant="success">{savedMessage}</Alert> : null}

      <Card>
        <CardBody>
          <Stack gap="sm">
            <Inline gap="sm" width="full" flexWrap>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search menu items or sections…"
              />
              {hasActiveSearch ? (
                <Button type="button" variant="outline" size="sm" onClick={handleClearSearch}>
                  Clear
                </Button>
              ) : null}
            </Inline>
            {hasActiveSearch ? (
              <Text variant="caption" color="secondary">
                {searchResultCount} {searchResultCount === 1 ? 'match' : 'matches'} for &ldquo;
                {searchQuery.trim()}&rdquo;
              </Text>
            ) : null}
          </Stack>
        </CardBody>
      </Card>

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
        <Stack gap="md">
          {displaySections.map((section) => {
            const isCollapsed = !hasActiveSearch && collapsedSections.has(section.id);
            const namedItems = section.items.filter((i) => i.name.trim());
            return (
              <Card key={section.id}>
                <CardHeader>
                  <Inline gap="sm" align="center" width="full" flexWrap>
                    <IconButton
                      size="sm"
                      label={isCollapsed ? 'Expand section' : 'Collapse section'}
                      onClick={() => toggleSectionCollapsed(section.id)}
                    >
                      {isCollapsed ? '▶' : '▼'}
                    </IconButton>
                    <Text aria-hidden>📁</Text>
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      placeholder="Section title (e.g. Main course)"
                    />
                    <Badge variant="neutral">{namedItems.length || section.items.length}</Badge>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                    >
                      Delete section
                    </Button>
                  </Inline>
                </CardHeader>

                {!isCollapsed ? (
                  <CardBody>
                    <Stack gap="md">
                      <Box
                        display="grid"
                        gap="sm"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                      >
                        {section.items.map((item) => {
                          const isAvailable = item.available !== false;
                          return (
                            <Card
                              key={item.id}
                              style={!isAvailable ? unavailableCardStyle : undefined}
                            >
                              <CardBody>
                                <Stack gap="sm">
                                  <Inline gap="sm" align="start" width="full">
                                    <Input
                                      value={item.name}
                                      onChange={(e) =>
                                        updateItem(section.id, item.id, {
                                          name: e.target.value,
                                        })
                                      }
                                      placeholder="Item name"
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

                                  <FormField label="Price">
                                    <Inline gap="sm" align="center" width="full">
                                      <Text color="secondary">₹</Text>
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
                                        placeholder="0"
                                      />
                                    </Inline>
                                  </FormField>

                                  <Divider />

                                  <Inline justify="between" align="center" width="full">
                                    <Text variant="caption" color="secondary">
                                      {isAvailable ? 'Available to sell' : 'Hidden from sell'}
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
                                  </Inline>

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
                                </Stack>
                              </CardBody>
                            </Card>
                          );
                        })}
                      </Box>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem(section.id)}
                      >
                        + Add item to {section.title.trim() || 'section'}
                      </Button>
                    </Stack>
                  </CardBody>
                ) : null}
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
