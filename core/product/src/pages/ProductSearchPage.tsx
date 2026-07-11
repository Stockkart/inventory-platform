import { useState, useEffect } from 'react';
import { cartApi } from '../api/cart.api';
import { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
import type {
  BillingMode,
  InventoryItem,
  QuotationSummary,
} from '@inventory-platform/product/types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Inline,
  PageHeader,
  PaginationBar,
  SearchInput,
  Select,
  Stack,
  Text,
  type SelectOptionDef,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { InventoryAlertDetails, ProductSearchCard, normalizedBillingMode } from '../ui';
import { sortInventoryByExpirySoonest } from '@inventory-platform/schema';
import {
  useAuthStore,
  useNotify,
  useShopAccessStore,
  useVerticalSchemaStore,
} from '@inventory-platform/session';
import { AddToSellQuotationPicker } from '../ui/AddToSellQuotationPicker';

const BILLING_MODE_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'ALL', label: 'All Modes' },
  { value: 'REGULAR', label: 'REGULAR' },
  { value: 'BASIC', label: 'BASIC' },
];

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
  const [billingModeFilter, setBillingModeFilter] = useState<'ALL' | BillingMode>('ALL');
  const [quotationPickerItem, setQuotationPickerItem] = useState<InventoryItem | null>(null);
  const [quotationPickerList, setQuotationPickerList] = useState<QuotationSummary[]>([]);
  const [cartBusinessType, setCartBusinessType] = useState('medical');
  const { success: notifySuccess, error: notifyError } = useNotify;
  const { user } = useAuthStore();
  const activeShopId = user?.shopId;
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const productSearchAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId]?.productSearch : undefined,
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch inventory';
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to search inventory';
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
      notifyError(err instanceof Error ? err.message : 'Failed to load product details');
      setSelectedItem(null);
    } finally {
      setDetailLoadingId(null);
    }
  };

  const addItemToQuotation = async (item: InventoryItem, purchaseId: string): Promise<void> => {
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

  const notifyAddedToQuotation = (item: InventoryItem, quotation?: QuotationSummary) => {
    const productName = item.name || 'Product';
    if (quotation) {
      notifySuccess(`Added "${productName}" to quotation for ${quotationLabel(quotation)}`);
    } else {
      notifySuccess(`Added "${productName}" to a new quotation`);
    }
  };

  const handleAddToSellError = (err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
    if (errorMessage.includes('Cannot mix REGULAR and BASIC inventory items in a single cart')) {
      notifyError(
        'Cannot add this item because the quotation already contains a different billing mode (REGULAR/BASIC). Pick another quotation or clear that cart.',
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
    quotations: QuotationSummary[],
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
    await commitAddToSell(quotationPickerItem, purchaseId, quotationPickerList);
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

  const filteredInventory = sortInventoryByExpirySoonest(
    inventory.filter((item) =>
      billingModeFilter === 'ALL' ? true : normalizedBillingMode(item) === billingModeFilter,
    ),
  );

  return (
    <Stack gap="md">
      <PageHeader
        title="Product Search"
        description="Search by product name, barcode, or batch number"
      />

      <Inline gap="sm" flexWrap>
        <Box width="full" className={surfaceChrome.growMin12}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={() => void handleSearch()}
            showSearchButton
            placeholder="Name, barcode, or batch number"
            disabled={isLoading}
            searchLabel={isLoading ? 'Searching…' : 'Search'}
          />
        </Box>
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
        <Select
          value={billingModeFilter}
          options={BILLING_MODE_OPTIONS}
          onChange={(e) => setBillingModeFilter(e.target.value as 'ALL' | BillingMode)}
          disabled={isLoading}
        />
      </Inline>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text variant="caption" color="secondary">
              {isLoading
                ? 'Loading…'
                : `Showing ${filteredInventory.length} ${
                    filteredInventory.length === 1 ? 'result' : 'results'
                  }`}
            </Text>

            {isLoading && filteredInventory.length === 0 ? (
              <CenteredLoader label="Loading inventory…" />
            ) : filteredInventory.length === 0 ? (
              <EmptyState
                title="No inventory items found"
                action={
                  searchQuery ? (
                    <Button variant="outline" onClick={handleClearSearch}>
                      Clear search to see all items
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <Box display="grid" gap="lg" width="full" className={surfaceChrome.autoGrid280}>
                  {filteredInventory.map((item) => {
                    const inventoryId = resolveInventoryDocumentId(item);
                    return (
                      <ProductSearchCard
                        key={item.id || item.lotId}
                        item={item}
                        isPageLoading={isLoading}
                        isDetailLoading={detailLoadingId === inventoryId}
                        isAddingToCart={addingToCart === inventoryId}
                        onViewDetails={openProductDetails}
                        onAddToSell={handleAddToSell}
                      />
                    );
                  })}
                </Box>
                <PaginationBar
                  page={searchPage}
                  totalPages={Math.max(searchTotalPages, 1)}
                  totalItems={searchTotalItems}
                  disabled={isLoading}
                  onPageChange={(p) => void handleSearch(p)}
                  pageSize={searchPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  onPageSizeChange={(n) => void handleSearch(0, n)}
                  aria-label="Product search results pages"
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
          setInventory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
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
    </Stack>
  );
}
