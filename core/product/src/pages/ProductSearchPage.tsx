import { useState, useEffect, FormEvent } from 'react';
import { cartApi } from '../api/cart.api';
import { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
import type { BillingMode, InventoryItem, QuotationSummary } from '@inventory-platform/types';
import { PaginationBar } from '@inventory-platform/ui-kit';
import { InventoryAlertDetails } from '../ui';
import {
  formatInventoryExpiryDate,
  sortInventoryByExpirySoonest,
} from '@inventory-platform/schema';
import styles from './product-search.module.css';
import { useAuthStore, useNotify, useShopAccessStore, useVerticalSchemaStore } from '@inventory-platform/session';
import { AddToSellQuotationPicker } from '../ui/AddToSellQuotationPicker';

export function meta() {
  return [
    { title: 'Product Search - StockKart' },
    {
      name: 'description',
      content: 'Quickly find products with powerful search and filtering',
    },
  ];
}

export function ProductSearchPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(0);
  const [searchPageSize, setSearchPageSize] = useState(10);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalItems, setSearchTotalItems] = useState(0);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [billingModeFilter, setBillingModeFilter] = useState<
    'ALL' | BillingMode
  >('ALL');
  const [quotationPickerItem, setQuotationPickerItem] =
    useState<InventoryItem | null>(null);
  const [quotationPickerList, setQuotationPickerList] = useState<
    QuotationSummary[]
  >([]);
  const [cartBusinessType, setCartBusinessType] = useState('medical');
  const { success: notifySuccess, error: notifyError } = useNotify;
  const { user } = useAuthStore();
  const activeShopId = user?.shopId;
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const productSearchAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId]?.productSearch : undefined
  );

  const hasActiveSearch = searchQuery.trim().length > 0;

  useEffect(() => {
    fetchAllInventory();
  }, []);

  useEffect(() => {
    if (!activeShopId) {
      return;
    }
    void fetchShopSchema('regular').then((schema) => {
      if (schema?.verticalId && schema.shopId === activeShopId) {
        setCartBusinessType(schema.verticalId);
      }
    });
  }, [activeShopId, fetchShopSchema]);

  const fetchAllInventory = async (page = 0, size = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getAll(page, size);
      setInventory(sortInventoryByExpirySoonest(response.data || []));
      // Update pagination info if available
      if (response.page) {
        setSearchTotalPages(response.page.totalPages || 0);
        setSearchTotalItems(response.page.totalItems || 0);
        setSearchPage(response.page.page || 0);
      } else {
        // Reset pagination if no page info
        setSearchTotalPages(0);
        setSearchTotalItems(0);
        setSearchPage(0);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch inventory';
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
      setSearchPage(0); // Reset to first page on new search
    }

    if (pageSize !== undefined) {
      setSearchPageSize(pageSize);
    }

    if (!hasActiveSearch) {
      fetchAllInventory(currentPage, currentPageSize);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.search({
        q: searchQuery.trim(),
        limit: currentPageSize,
        sort: 'expiryDate:asc',
      });
      setInventory(sortInventoryByExpirySoonest(response.data || []));
      const total = response.data?.length ?? 0;
      setSearchTotalPages(total > 0 ? 1 : 0);
      setSearchTotalItems(total);
      setSearchPage(0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search inventory';
      notifyError(errorMessage);
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchPage(0);
    setSearchTotalPages(0);
    setSearchTotalItems(0);
    fetchAllInventory(0, searchPageSize);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const openProductDetails = async (item: InventoryItem) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      notifyError('Cannot open product: missing inventory id');
      return;
    }
    setDetailLoadingId(inventoryId);
    setSelectedItem(item);
    try {
      const full = await inventoryApi.getById(inventoryId);
      setSelectedItem(full);
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load product details'
      );
      setSelectedItem(null);
    } finally {
      setDetailLoadingId(null);
    }
  };

  const addItemToQuotation = async (
    item: InventoryItem,
    purchaseId: string
  ): Promise<void> => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      notifyError('Cannot add: missing inventory id');
      return;
    }

    const effectivePrice = item.sellingPrice ?? item.priceToRetail;
    if (effectivePrice == null) {
      notifyError('Cannot add: product price is not set');
      return;
    }

    await cartApi.add({
      businessType: cartBusinessType,
      purchaseId,
      items: [
        {
          id: inventoryId,
          quantity: 1,
          priceToRetail: effectivePrice,
        },
      ],
    });
  };

  const quotationLabel = (q: QuotationSummary) => q.customerName;

  const notifyAddedToQuotation = (
    item: InventoryItem,
    quotation?: QuotationSummary
  ) => {
    const productName = item.name || 'Product';
    if (quotation) {
      notifySuccess(
        `Added "${productName}" to quotation for ${quotationLabel(quotation)}`
      );
    } else {
      notifySuccess(`Added "${productName}" to a new quotation`);
    }
  };

  const handleAddToSellError = (err: unknown) => {
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to add item to cart';
    if (
      errorMessage.includes(
        'Cannot mix REGULAR and BASIC inventory items in a single cart'
      )
    ) {
      notifyError(
        'Cannot add this item because the quotation already contains a different billing mode (REGULAR/BASIC). Pick another quotation or clear that cart.'
      );
    } else {
      notifyError(errorMessage);
    }
  };

  const resolveTargetQuotation = async (): Promise<{
    quotations: QuotationSummary[];
    purchaseId: string;
  }> => {
    let list = (await cartApi.listQuotations()).quotations;
    if (list.length === 0) {
      const cart = await cartApi.createQuotation({
        businessType: cartBusinessType,
      });
      list = (await cartApi.listQuotations()).quotations;
      return { quotations: list, purchaseId: cart.purchaseId };
    }
    return { quotations: list, purchaseId: list[0].purchaseId };
  };

  const commitAddToSell = async (
    item: InventoryItem,
    purchaseId: string,
    quotations: QuotationSummary[]
  ) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      return;
    }
    setAddingToCart(inventoryId);
    setError(null);
    setSuccessMessage(null);
    try {
      await addItemToQuotation(item, purchaseId);
      const quotation = quotations.find((q) => q.purchaseId === purchaseId);
      notifyAddedToQuotation(item, quotation);
      setQuotationPickerItem(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      handleAddToSellError(err);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleAddToSell = async (item: InventoryItem) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      notifyError('Cannot add: missing inventory id');
      return;
    }
    if (item.currentCount <= 0) {
      notifyError('Product is out of stock');
      return;
    }

    const effectivePrice = item.sellingPrice ?? item.priceToRetail;
    if (effectivePrice == null) {
      notifyError('Cannot add: product price is not set');
      return;
    }

    setAddingToCart(inventoryId);
    setError(null);
    try {
      const { quotations, purchaseId } = await resolveTargetQuotation();
      if (quotations.length > 1) {
        setQuotationPickerList(quotations);
        setQuotationPickerItem(item);
        setAddingToCart(null);
        return;
      }
      await commitAddToSell(item, purchaseId, quotations);
    } catch (err) {
      handleAddToSellError(err);
      setAddingToCart(null);
    }
  };

  const handlePickerSelect = async (purchaseId: string) => {
    if (!quotationPickerItem) {
      return;
    }
    await commitAddToSell(
      quotationPickerItem,
      purchaseId,
      quotationPickerList
    );
  };

  const handlePickerNewQuotation = async () => {
    if (!quotationPickerItem) {
      return;
    }
    const inventoryId = resolveInventoryDocumentId(quotationPickerItem);
    if (!inventoryId) {
      return;
    }
    setAddingToCart(inventoryId);
    try {
      const cart = await cartApi.createQuotation({
        businessType: cartBusinessType,
      });
      const list = (await cartApi.listQuotations()).quotations;
      setQuotationPickerList(list);
      await commitAddToSell(quotationPickerItem, cart.purchaseId, list);
    } catch (err) {
      handleAddToSellError(err);
      setAddingToCart(null);
    }
  };

  const normalizedMode = (item: InventoryItem): BillingMode =>
    item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';

  const filteredInventory = sortInventoryByExpirySoonest(
    inventory.filter((item) =>
      billingModeFilter === 'ALL'
        ? true
        : normalizedMode(item) === billingModeFilter
    )
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Product Search</h2>
        <p className={styles.subtitle}>
          Search by product name, barcode, or batch number
        </p>
      </div>
      <div className={styles.searchContainer}>
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <span className={styles.searchIcon} role="img" aria-label="Search">
            🔍
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Name, barcode, or batch 1947304"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.searchBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          {hasActiveSearch && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearSearch}
              disabled={isLoading}
            >
              Clear
            </button>
          )}
          <select
            className={styles.modeFilter}
            value={billingModeFilter}
            onChange={(e) =>
              setBillingModeFilter(e.target.value as 'ALL' | BillingMode)
            }
            disabled={isLoading}
          >
            <option value="ALL">All Modes</option>
            <option value="REGULAR">REGULAR</option>
            <option value="BASIC">BASIC</option>
          </select>
        </form>
      </div>
      {error && <div className={styles.errorMessage}>{error}</div>}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}
      <div className={styles.results}>
        <div className={styles.resultsHeader}>
          <span className={styles.resultsCount}>
            {isLoading
              ? 'Loading...'
              : `Showing ${filteredInventory.length} ${
                  filteredInventory.length === 1 ? 'result' : 'results'
                }`}
          </span>
        </div>
        {isLoading && filteredInventory.length === 0 ? (
          <div className={styles.loading}>Loading inventory...</div>
        ) : filteredInventory.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No inventory items found.</p>
            {searchQuery && (
              <button onClick={handleClearSearch} className={styles.clearBtn}>
                Clear search to see all items
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.productsGrid}>
              {filteredInventory.map((item) => (
                <div key={item.id || item.lotId} className={styles.productCard}>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>
                      {item.name || 'Unnamed Product'}
                    </h3>
                    <span className={styles.modeBadge}>
                      {normalizedMode(item)}
                    </span>
                    {item.companyName && (
                      <p className={styles.productCompany}>
                        Company: {item.companyName}
                      </p>
                    )}
                    {item.barcode && (
                      <p className={styles.productBarcode}>
                        Barcode: {item.barcode}
                      </p>
                    )}
                    {item.location && (
                      <p className={styles.productLocation}>
                        Location: {item.location}
                      </p>
                    )}
                    <div className={styles.productDetails}>
                      <div className={styles.stockInfo}>
                        <span className={styles.productStock}>
                          Current: {item.currentCount}
                        </span>
                        <span className={styles.productStock}>
                          Received: {item.receivedCount} | Sold:{' '}
                          {item.soldCount}
                        </span>
                      </div>
                      <div className={styles.priceInfo}>
                        <span className={styles.productPrice}>
                          Selling Price: ₹
                          {(item.sellingPrice ?? item.priceToRetail) != null
                            ? (item.sellingPrice ??
                                item.priceToRetail)!.toFixed(2)
                            : '—'}
                        </span>
                        <span className={styles.productPrice}>
                          MRP: ₹
                          {item.maximumRetailPrice != null
                            ? item.maximumRetailPrice.toFixed(2)
                            : '—'}
                        </span>
                        {item.saleAdditionalDiscount !== null &&
                          item.saleAdditionalDiscount !== undefined && (
                            <span className={styles.productPrice}>
                              Additional Discount:{' '}
                              {item.saleAdditionalDiscount.toFixed(2)}%
                            </span>
                          )}
                      </div>
                      <div className={styles.expiryInfo}>
                        <span className={styles.expiryDate}>
                          Expires: {formatInventoryExpiryDate(item)}
                        </span>
                      </div>
                      {(item.itemType ||
                        item.discountApplicable ||
                        item.purchaseDate ||
                        item.createdAt ||
                        item.schemeType ||
                        item.scheme != null) && (
                        <>
                          <div className={styles.productMeta}>
                            {item.itemType && item.itemType !== 'NORMAL' && (
                              <span className={styles.productMetaItem}>
                                Type:{' '}
                                {item.itemType === 'DEGREE' &&
                                item.itemTypeDegree != null
                                  ? `Temperature (${item.itemTypeDegree}°)`
                                  : item.itemType === 'COSTLY'
                                  ? 'Costly'
                                  : item.itemType}
                              </span>
                            )}
                            {item.discountApplicable && (
                              <span className={styles.productMetaItem}>
                                {item.discountApplicable === 'DISCOUNT'
                                  ? 'Discount applicable'
                                  : item.discountApplicable === 'SCHEME'
                                  ? 'Scheme applicable'
                                  : 'Both discount and scheme applicable'}
                              </span>
                            )}
                            {(item.purchaseDate || item.createdAt) && (
                              <span className={styles.productMetaItem}>
                                Purchased:{' '}
                                {formatDate(
                                  item.purchaseDate || item.createdAt!
                                )}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const st = item.schemeType ?? 'FIXED_UNITS';
                            if (
                              st === 'PERCENTAGE' &&
                              item.schemePercentage != null
                            ) {
                              return (
                                <div className={styles.productMetaScheme}>
                                  <span className={styles.productMetaItem}>
                                    Scheme/Deal: {item.schemePercentage}%
                                  </span>
                                </div>
                              );
                            }
                            if (
                              (st === 'FIXED_UNITS' || !item.schemeType) &&
                              item.scheme != null &&
                              item.scheme > 0
                            ) {
                              return (
                                <div className={styles.productMetaScheme}>
                                  <span className={styles.productMetaItem}>
                                    Scheme/Deal: {item.scheme} free
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                    </div>
                    {item.description && (
                      <p className={styles.productDescription}>
                        {item.description}
                      </p>
                    )}
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.viewDetailsBtn}
                        onClick={() => openProductDetails(item)}
                        disabled={
                          isLoading ||
                          detailLoadingId === resolveInventoryDocumentId(item)
                        }
                      >
                        {detailLoadingId === resolveInventoryDocumentId(item)
                          ? 'Loading…'
                          : 'View Details'}
                      </button>
                      <button
                        className={styles.addToSellBtn}
                        onClick={() => handleAddToSell(item)}
                        disabled={
                          isLoading ||
                          addingToCart === resolveInventoryDocumentId(item) ||
                          item.currentCount <= 0 ||
                          (item.sellingPrice ?? item.priceToRetail) == null
                        }
                      >
                        {addingToCart === resolveInventoryDocumentId(item)
                          ? 'Adding...'
                          : item.currentCount <= 0
                          ? 'Out of Stock'
                          : (item.sellingPrice ?? item.priceToRetail) == null
                          ? 'Price not set'
                          : 'Add to Sell'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar
              page={searchPage}
              totalPages={Math.max(searchTotalPages, 1)}
              totalItems={searchTotalItems}
              disabled={isLoading}
              onPageChange={(p) => handleSearch(undefined, p)}
              pageSize={searchPageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={(n) => handleSearch(undefined, 0, n)}
              aria-label="Product search results pages"
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
          setInventory((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i))
          );
          setSelectedItem(updated);
        }}
      />
      <AddToSellQuotationPicker
        open={quotationPickerItem !== null}
        productLabel={quotationPickerItem?.name || 'this product'}
        quotations={quotationPickerList}
        isSubmitting={
          quotationPickerItem !== null &&
          addingToCart === resolveInventoryDocumentId(quotationPickerItem)
        }
        onSelect={(purchaseId) => void handlePickerSelect(purchaseId)}
        onNewQuotation={() => void handlePickerNewQuotation()}
        onCancel={() => {
          if (addingToCart) return;
          setQuotationPickerItem(null);
        }}
      />
    </div>
  );
}
