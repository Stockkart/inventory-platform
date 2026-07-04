import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cartApi } from '../api/cart.api';
import {
  inventoryApi,
  resolveInventoryDocumentId,
} from '../api/inventory.api';
import type { InventoryItem } from '@inventory-platform/types';
import { inventorySellableRef } from '@inventory-platform/types';
import {
  InventoryAlertDetails,
  PaginationBar,
  getExtensionFieldString,
  isSellDirectInventory,
} from '@inventory-platform/ui';
import { useNotify, useVerticalSchemaStore, useAuthStore, useShopAccessStore } from '@inventory-platform/store';
import searchStyles from './product-search.module.css';
import styles from './manual-stock.module.css';

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

  const deltaClass = useMemo(() => {
    if (!isValidQty) return '';
    const delta = parsedQty - current;
    if (delta > 0) return styles.deltaPositive;
    if (delta < 0) return styles.deltaNegative;
    return '';
  }, [current, isValidQty, parsedQty]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
      const message =
        err instanceof Error ? err.message : 'Failed to correct stock';
      setError(message);
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-correction-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h3 id="stock-correction-title" className={styles.modalTitle}>
              Correct stock
            </h3>
            <p className={styles.modalSubtitle}>
              {item.name || 'Ingredient'}
            </p>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className={styles.modalBody}>
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Current stock</span>
              <div className={styles.currentStock}>
                {current} {unit}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="correction-qty">
                New quantity ({unit})
              </label>
              <input
                id="correction-qty"
                type="number"
                min={0}
                step="any"
                className={styles.qtyInput}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              {isValidQty && (
                <span className={`${styles.deltaHint} ${deltaClass}`}>
                  Change: {formatDelta(current, parsedQty)} {unit}
                </span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="correction-note">
                Note (optional)
              </label>
              <textarea
                id="correction-note"
                className={styles.noteInput}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Spillage, recount, waste…"
                disabled={isSubmitting}
              />
            </div>

            {error && <div className={styles.modalError}>{error}</div>}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.modalSubmitBtn}
              disabled={isSubmitting || !hasChange}
            >
              {isSubmitting ? 'Saving…' : 'Apply correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const [correctionItem, setCorrectionItem] = useState<InventoryItem | null>(
    null
  );
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState('cafe');
  const { error: notifyError, success: notifySuccess } = useNotify;
  const { user } = useAuthStore();
  const productSearchAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId]?.productSearch : undefined
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch ingredients';
      notifyError(errorMessage);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (
    e?: FormEvent<HTMLFormElement>,
    pageNum?: number,
    pageSize?: number
  ) => {
    e?.preventDefault();

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
      const response = await inventoryApi.search(
        searchQuery.trim(),
        currentPage,
        currentPageSize
      );
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search ingredients';
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
      notifyError(
        err instanceof Error ? err.message : 'Failed to load ingredient details'
      );
      setSelectedItem(null);
    } finally {
      setDetailLoadingId(null);
    }
  };

  const refreshItemInList = (updated: InventoryItem) => {
    const id = resolveInventoryDocumentId(updated);
    setInventory((prev) =>
      prev.map((row) =>
        resolveInventoryDocumentId(row) === id ? updated : row
      )
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
      notifyError(
        err instanceof Error ? err.message : 'Failed to add item to cart'
      );
    } finally {
      setAddingToCartId(null);
    }
  };

  return (
    <div className={searchStyles.page}>
      <div className={searchStyles.header}>
        <h2 className={searchStyles.title}>Ingredient Search</h2>
        <p className={searchStyles.subtitle}>
          Search ingredients by name or barcode. Register new stock via{' '}
          <Link to="/dashboard/product-registration">Ingredient Registration</Link>
          . Adjust counts with{' '}
          <strong>Correct stock</strong> or review{' '}
          <Link to="/dashboard/stock-corrections">correction history</Link>.
        </p>
      </div>
      <div className={searchStyles.searchContainer}>
        <form className={searchStyles.searchBar} onSubmit={handleSearch}>
          <span className={searchStyles.searchIcon} role="img" aria-label="Search">
            🔍
          </span>
          <input
            type="text"
            className={searchStyles.searchInput}
            placeholder="Name or barcode"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={searchStyles.searchBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          {hasActiveSearch && (
            <button
              type="button"
              className={searchStyles.clearBtn}
              onClick={handleClearSearch}
              disabled={isLoading}
            >
              Clear
            </button>
          )}
        </form>
      </div>
      {error && <div className={searchStyles.errorMessage}>{error}</div>}
      <div className={searchStyles.results}>
        <div className={searchStyles.resultsHeader}>
          <span className={searchStyles.resultsCount}>
            {isLoading
              ? 'Loading...'
              : `Showing ${inventory.length} ${
                  inventory.length === 1 ? 'result' : 'results'
                }`}
          </span>
        </div>
        {isLoading && inventory.length === 0 ? (
          <div className={searchStyles.loading}>Loading ingredients...</div>
        ) : inventory.length === 0 ? (
          <div className={searchStyles.emptyState}>
            <p>No ingredients found.</p>
            {hasActiveSearch && (
              <button onClick={handleClearSearch} className={searchStyles.clearBtn}>
                Clear search to see all items
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={searchStyles.productsGrid}>
              {inventory.map((item) => {
                const ingredientType = getExtensionFieldString(
                  item,
                  'ingredientType'
                );
                const stock = stockQty(item);
                const unit = stockUnit(item);
                const low = isLowStock(item);
                const itemId = resolveInventoryDocumentId(item);
                const sellDirect = isSellDirectInventory(item);
                const price = sellPrice(item);
                return (
                  <div
                    key={item.id || item.lotId}
                    className={searchStyles.productCard}
                  >
                    <div className={searchStyles.productInfo}>
                      <h3 className={searchStyles.productName}>
                        {item.name || 'Unnamed ingredient'}
                      </h3>
                      {ingredientType && (
                        <span className={searchStyles.modeBadge}>
                          {ingredientType}
                        </span>
                      )}
                      {sellDirect && (
                        <span className={styles.sellDirectBadge}>
                          Sell direct
                        </span>
                      )}
                      {item.barcode && (
                        <p className={searchStyles.productBarcode}>
                          Barcode: {item.barcode}
                        </p>
                      )}
                      {item.location && (
                        <p className={searchStyles.productLocation}>
                          Location: {item.location}
                        </p>
                      )}
                      <div className={searchStyles.productDetails}>
                        <div className={searchStyles.stockInfo}>
                          <span
                            className={searchStyles.productStock}
                            style={
                              low
                                ? { color: 'var(--error-color, #dc2626)' }
                                : undefined
                            }
                          >
                            Stock: {stock} {unit}
                            {low ? ' (low)' : ''}
                          </span>
                          {(item.thresholdCount ?? 0) > 0 && (
                            <span className={searchStyles.productStock}>
                              Threshold: {item.thresholdCount}
                            </span>
                          )}
                          <span className={searchStyles.productStock}>
                            Received: {item.receivedCount ?? 0} | Used:{' '}
                            {item.soldCount ?? 0}
                          </span>
                        </div>
                        {item.costPrice != null && (
                          <div className={searchStyles.priceInfo}>
                            <span className={searchStyles.productPrice}>
                              Cost: ₹{item.costPrice.toFixed(2)} / {unit}
                            </span>
                          </div>
                        )}
                        {sellDirect && price > 0 && (
                          <div className={searchStyles.priceInfo}>
                            <span className={searchStyles.productPrice}>
                              Sell: ₹{price.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      {item.description && (
                        <p className={searchStyles.productDescription}>
                          {item.description}
                        </p>
                      )}
                      <div className={searchStyles.actionButtons}>
                        <button
                          type="button"
                          className={searchStyles.viewDetailsBtn}
                          onClick={() => void openIngredientDetails(item)}
                          disabled={
                            isLoading || detailLoadingId === itemId
                          }
                        >
                          {detailLoadingId === itemId
                            ? 'Loading…'
                            : 'View Details'}
                        </button>
                        <button
                          type="button"
                          className={styles.correctStockBtn}
                          onClick={() => setCorrectionItem(item)}
                          disabled={!itemId}
                        >
                          Correct stock
                        </button>
                        {sellDirect && (
                          <button
                            type="button"
                            className={styles.addToCartBtn}
                            onClick={() => void handleAddToCart(item)}
                            disabled={
                              !itemId ||
                              addingToCartId === itemId ||
                              stock <= 0 ||
                              price <= 0
                            }
                          >
                            {addingToCartId === itemId
                              ? 'Adding…'
                              : 'Add to cart'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationBar
              page={searchPage}
              totalPages={Math.max(searchTotalPages, 1)}
              totalItems={searchTotalItems}
              disabled={isLoading}
              onPageChange={(p) => void handleSearch(undefined, p)}
              pageSize={searchPageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={(n) => void handleSearch(undefined, 0, n)}
              aria-label="Ingredient search results pages"
            />
          </>
        )}
      </div>

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

      {correctionItem && (
        <StockCorrectionModal
          item={correctionItem}
          onClose={() => setCorrectionItem(null)}
          onSuccess={refreshItemInList}
        />
      )}
    </div>
  );
}
