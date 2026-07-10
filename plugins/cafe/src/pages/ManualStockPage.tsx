import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cartApi, inventoryApi, resolveInventoryDocumentId } from '@inventory-platform/product/api';
import type { InventoryItem } from '@inventory-platform/product/types';
import { inventorySellableRef } from '@inventory-platform/product/types';
import { InventoryAlertDetails } from '@inventory-platform/product';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  FormField,
  Grid,
  Inline,
  Input,
  Modal,
  PageHeader,
  PaginationBar,
  SearchInput,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { getExtensionFieldString, isSellDirectInventory } from '@inventory-platform/schema';
import {
  useNotify,
  useVerticalSchemaStore,
  useAuthStore,
  useShopAccessStore,
} from '@inventory-platform/session';

export function meta() {
  return [
    { title: 'Ingredient Search - StockKart' },
    {
      name: 'description',
      content: 'Search and view ingredient stock levels',
    },
  ];
}

function stockQty(item: InventoryItem): number {
  return item.currentBaseCount ?? item.currentCount ?? 0;
}

function displayQty(item: InventoryItem): number {
  const count = item.currentCount;
  if (count != null && Number.isFinite(Number(count))) {
    return Number(count);
  }
  return stockQty(item);
}

function stockUnit(item: InventoryItem): string {
  return item.baseUnit?.trim() || item.uqc?.trim() || 'units';
}

function sellPrice(item: InventoryItem): number {
  const selling = item.sellingPrice;
  if (selling != null && selling > 0) return selling;
  return item.priceToRetail ?? 0;
}

function isLowStock(item: InventoryItem): boolean {
  const stock = stockQty(item);
  const threshold = item.thresholdCount ?? 0;
  return threshold > 0 && stock <= threshold;
}

function formatDelta(current: number, next: number): string {
  const delta = next - current;
  if (!Number.isFinite(delta) || delta === 0) return 'No change';
  const abs = Math.abs(delta);
  const body = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  return delta > 0 ? `+${body}` : `−${body}`;
}

function StockCorrectionModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: (updated: InventoryItem) => void;
}) {
  const { success: notifySuccess, error: notifyError } = useNotify;
  const inventoryId = resolveInventoryDocumentId(item);
  const current = displayQty(item);
  const unit = stockUnit(item);
  const [newQty, setNewQty] = useState(String(current));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedQty = Number(newQty);
  const isValidQty = newQty.trim() !== '' && Number.isFinite(parsedQty) && parsedQty >= 0;
  const hasChange = isValidQty && parsedQty !== current;

  const deltaColor = useMemo(() => {
    if (!isValidQty) return undefined;
    const delta = parsedQty - current;
    if (delta > 0) return 'success' as const;
    if (delta < 0) return 'danger' as const;
    return 'secondary' as const;
  }, [current, isValidQty, parsedQty]);

  const handleSubmit = async () => {
    if (!inventoryId) {
      setError('Missing inventory id');
      return;
    }
    if (!isValidQty) {
      setError('Enter a valid quantity (0 or more)');
      return;
    }
    if (!hasChange) {
      setError('New quantity must differ from current stock');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const correction = await inventoryApi.createInventoryCorrection({
        note: note.trim() || 'Ingredient stock correction',
        lines: [{ inventoryId, requestedCurrentCount: parsedQty }],
      });
      const line = correction.lines?.[0];
      if (!line?.lineId) {
        throw new Error('Correction created but line id missing');
      }
      await inventoryApi.approveInventoryCorrectionLine(correction.id, line.lineId);

      const updated = await inventoryApi.getById(inventoryId);
      notifySuccess(`Stock updated for "${item.name || 'ingredient'}"`);
      onSuccess(updated);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to correct stock';
      setError(message);
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="md">
      <Modal.Header title="Correct stock" onClose={onClose} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">{item.name || 'Ingredient'}</Text>

          <FormField label="Current stock">
            <Input readOnly readOnlyStyle value={`${current} ${unit}`} />
          </FormField>

          <FormField label={`New quantity (${unit})`} id="correction-qty">
            <Input
              id="correction-qty"
              type="number"
              min={0}
              step="any"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            {isValidQty ? (
              <Text variant="caption" color={deltaColor} weight="semibold">
                Change: {formatDelta(current, parsedQty)} {unit}
              </Text>
            ) : null}
          </FormField>

          <FormField label="Note (optional)" id="correction-note">
            <Textarea
              id="correction-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Spillage, recount, waste…"
              disabled={isSubmitting}
            />
          </FormField>

          {error ? <Alert variant="danger">{error}</Alert> : null}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="solid"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || !hasChange}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Apply correction'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export function ManualStockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPage, setSearchPage] = useState(0);
  const [searchPageSize, setSearchPageSize] = useState(10);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalItems, setSearchTotalItems] = useState(0);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [correctionItem, setCorrectionItem] = useState<InventoryItem | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState('cafe');
  const { error: notifyError, success: notifySuccess } = useNotify;
  const { user } = useAuthStore();
  const productSearchAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId]?.productSearch : undefined,
  );
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);

  const hasActiveSearch = searchQuery.trim().length > 0;

  useEffect(() => {
    void fetchShopSchema('regular').then((schema) => {
      if (schema?.verticalId) {
        setBusinessType(schema.verticalId);
      }
    });
  }, [fetchShopSchema]);

  useEffect(() => {
    void fetchAllInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllInventory = async (page = 0, size = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getAll(page, size);
      setInventory(response.data || []);
      if (response.page) {
        setSearchTotalPages(response.page.totalPages || 0);
        setSearchTotalItems(response.page.totalItems || 0);
        setSearchPage(response.page.page || 0);
      } else {
        setSearchTotalPages(0);
        setSearchTotalItems(0);
        setSearchPage(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ingredients';
      notifyError(errorMessage);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (pageNum?: number, pageSize?: number) => {
    const currentPage = pageNum !== undefined ? pageNum : 0;
    const currentPageSize = pageSize !== undefined ? pageSize : searchPageSize;

    if (pageNum === undefined && pageSize === undefined) {
      setSearchPage(0);
    }

    if (pageSize !== undefined) {
      setSearchPageSize(pageSize);
    }

    if (!hasActiveSearch) {
      await fetchAllInventory(currentPage, currentPageSize);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.search(searchQuery.trim(), currentPage, currentPageSize);
      setInventory(response.data || []);
      if (response.page) {
        setSearchTotalPages(response.page.totalPages || 0);
        setSearchTotalItems(response.page.totalItems || 0);
        setSearchPage(response.page.page || 0);
      } else {
        const total = response.data?.length ?? 0;
        setSearchTotalPages(total > 0 ? 1 : 0);
        setSearchTotalItems(total);
        setSearchPage(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search ingredients';
      notifyError(errorMessage);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchPage(0);
    void fetchAllInventory(0, searchPageSize);
  };

  const openIngredientDetails = async (item: InventoryItem) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      notifyError('Cannot open ingredient: missing inventory id');
      return;
    }
    setDetailLoadingId(inventoryId);
    setSelectedItem(item);
    try {
      const full = await inventoryApi.getById(inventoryId);
      setSelectedItem(full);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load ingredient details');
      setSelectedItem(null);
    } finally {
      setDetailLoadingId(null);
    }
  };

  const refreshItemInList = (updated: InventoryItem) => {
    const id = resolveInventoryDocumentId(updated);
    setInventory((prev) =>
      prev.map((row) => (resolveInventoryDocumentId(row) === id ? updated : row)),
    );
  };

  const handleAddToCart = async (item: InventoryItem) => {
    const lotId = resolveInventoryDocumentId(item);
    if (!lotId) {
      notifyError('Cannot add to cart: missing inventory id');
      return;
    }
    const price = sellPrice(item);
    const stock = stockQty(item);
    if (price <= 0) {
      notifyError('Set a sell price before adding this item to the cart');
      return;
    }
    if (stock <= 0) {
      notifyError('Out of stock');
      return;
    }

    setAddingToCartId(lotId);
    try {
      await cartApi.add({
        businessType,
        items: [{ sellableRef: inventorySellableRef(lotId), quantity: 1 }],
      });
      notifySuccess(`Added "${item.name || 'item'}" to cart`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to add item to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  return (
    <Stack gap="md">
      <PageHeader title="Ingredient Search" description="Search ingredients by name or barcode." />

      <Text color="secondary">
        Register new stock via{' '}
        <Link to="/dashboard/product-registration">Ingredient Registration</Link>. Adjust counts
        with{' '}
        <Text as="span" weight="semibold">
          Correct stock
        </Text>{' '}
        or review <Link to="/dashboard/stock-corrections">correction history</Link>.
      </Text>

      <Inline gap="sm" width="full" flexWrap>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={() => void handleSearch()}
          showSearchButton
          placeholder="Name or barcode"
          disabled={isLoading}
          searchLabel={isLoading ? 'Searching…' : 'Search'}
        />
        {hasActiveSearch ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearSearch}
            disabled={isLoading}
          >
            Clear
          </Button>
        ) : null}
      </Inline>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text variant="caption" color="secondary">
              {isLoading
                ? 'Loading…'
                : `Showing ${inventory.length} ${inventory.length === 1 ? 'result' : 'results'}`}
            </Text>

            {isLoading && inventory.length === 0 ? (
              <CenteredLoader label="Loading ingredients…" />
            ) : inventory.length === 0 ? (
              <EmptyState
                title="No ingredients found"
                action={
                  hasActiveSearch ? (
                    <Button variant="outline" onClick={handleClearSearch}>
                      Clear search to see all items
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <Grid columns={3} gap="md" width="full">
                  {inventory.map((item) => {
                    const ingredientType = getExtensionFieldString(item, 'ingredientType');
                    const stock = stockQty(item);
                    const unit = stockUnit(item);
                    const low = isLowStock(item);
                    const itemId = resolveInventoryDocumentId(item);
                    const sellDirect = isSellDirectInventory(item);
                    const price = sellPrice(item);
                    return (
                      <Card key={item.id || item.lotId}>
                        <CardBody>
                          <Stack gap="sm">
                            <Inline gap="sm" align="center" flexWrap>
                              <Text variant="heading3">{item.name || 'Unnamed ingredient'}</Text>
                              {ingredientType ? (
                                <Badge variant="neutral">{ingredientType}</Badge>
                              ) : null}
                              {sellDirect ? <Badge variant="success">Sell direct</Badge> : null}
                            </Inline>

                            {item.barcode ? (
                              <Text variant="caption" color="secondary">
                                Barcode: {item.barcode}
                              </Text>
                            ) : null}
                            {item.location ? (
                              <Text variant="caption" color="secondary">
                                Location: {item.location}
                              </Text>
                            ) : null}

                            <Stack gap="xs">
                              <Text variant="caption" color={low ? 'danger' : 'secondary'}>
                                Stock: {stock} {unit}
                                {low ? ' (low)' : ''}
                              </Text>
                              {(item.thresholdCount ?? 0) > 0 ? (
                                <Text variant="caption" color="secondary">
                                  Threshold: {item.thresholdCount}
                                </Text>
                              ) : null}
                              <Text variant="caption" color="secondary">
                                Received: {item.receivedCount ?? 0} | Used: {item.soldCount ?? 0}
                              </Text>
                              {item.costPrice != null ? (
                                <Text variant="caption" color="secondary">
                                  Cost: ₹{item.costPrice.toFixed(2)} / {unit}
                                </Text>
                              ) : null}
                              {sellDirect && price > 0 ? (
                                <Text variant="caption" color="secondary">
                                  Sell: ₹{price.toFixed(2)}
                                </Text>
                              ) : null}
                            </Stack>

                            {item.description ? (
                              <Text variant="caption" color="secondary">
                                {item.description}
                              </Text>
                            ) : null}

                            <Inline gap="sm" flexWrap>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void openIngredientDetails(item)}
                                disabled={isLoading || detailLoadingId === itemId}
                              >
                                {detailLoadingId === itemId ? 'Loading…' : 'View Details'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCorrectionItem(item)}
                                disabled={!itemId}
                              >
                                Correct stock
                              </Button>
                              {sellDirect ? (
                                <Button
                                  type="button"
                                  variant="solid"
                                  size="sm"
                                  onClick={() => void handleAddToCart(item)}
                                  disabled={
                                    !itemId || addingToCartId === itemId || stock <= 0 || price <= 0
                                  }
                                >
                                  {addingToCartId === itemId ? 'Adding…' : 'Add to cart'}
                                </Button>
                              ) : null}
                            </Inline>
                          </Stack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </Grid>
                <PaginationBar
                  page={searchPage}
                  totalPages={Math.max(searchTotalPages, 1)}
                  totalItems={searchTotalItems}
                  disabled={isLoading}
                  onPageChange={(p) => void handleSearch(p)}
                  pageSize={searchPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  onPageSizeChange={(n) => void handleSearch(0, n)}
                  aria-label="Ingredient search results pages"
                />
              </>
            )}
          </Stack>
        </CardBody>
      </Card>

      <InventoryAlertDetails
        open={selectedItem !== null}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        editable
        productSearchAccess={productSearchAccess}
        onUpdated={(updated) => {
          refreshItemInList(updated);
          setSelectedItem(updated);
        }}
      />

      {correctionItem ? (
        <StockCorrectionModal
          item={correctionItem}
          onClose={() => setCorrectionItem(null)}
          onSuccess={refreshItemInList}
        />
      ) : null}
    </Stack>
  );
}
