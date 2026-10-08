import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart.api';
import { estimatesApi } from '../api/estimates.api';
import { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
import type {
  EstimateSummary,
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
  Icon,
  Inline,
  PageHeader,
  PaginationBar,
  SearchInput,
  Stack,
  Switch,
  Text,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { Search } from 'lucide-react';
import { InventoryAlertDetails, ProductSearchCard } from '../ui';
import { SearchFilterStrip } from '../ui/search/SearchFilterStrip';
import { ActiveFilterChips } from '../ui/search/ActiveFilterChips';
import { SortSelect } from '../ui/search/SortSelect';
import { useProductSearch } from '../search/useProductSearch';
import { PAGE_SIZE_OPTIONS } from '../search/searchState';
import { productKeys } from '../queries/keys';
import { rememberOpenQuotationId } from '../lib/sellSession';
import { getShopAvailableBaseCount } from '../lib/inventoryAvailability';
import { CARD_SURFACE_IDS } from '../model/cardLayout.types';
import { shopAccessPolicy } from '../cardLayout/fieldVisibility';
import { useSurfaceCardLayout } from '../cardLayout/useSurfaceCardLayout';
import {
  useAuthStore,
  useNotify,
  useShopAccessStore,
  useVerticalSchemaStore,
} from '@inventory-platform/session';
import { AddToSellQuotationPicker } from '../ui/AddToSellQuotationPicker';
import { AddToEstimatePicker } from '../ui/AddToEstimatePicker';
import { AddToCartDestinationPicker, type CartDestination } from '../ui/AddToCartDestinationPicker';

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
  const search = useProductSearch();
  const queryClient = useQueryClient();
  // Cards edited in the detail modal are patched here so the page does not refetch to show them.
  const [patched, setPatched] = useState<Record<string, InventoryItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [quotationPickerItem, setQuotationPickerItem] = useState<InventoryItem | null>(null);
  const [quotationPickerList, setQuotationPickerList] = useState<QuotationSummary[]>([]);
  const [estimatePickerItem, setEstimatePickerItem] = useState<InventoryItem | null>(null);
  const [estimatePickerList, setEstimatePickerList] = useState<EstimateSummary[]>([]);
  const [destinationPickerItem, setDestinationPickerItem] = useState<InventoryItem | null>(null);
  // The quantity chosen on the card. It has to outlive the destination and document pickers,
  // whose callbacks only know which purchase to add to.
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [cartBusinessType, setCartBusinessType] = useState('medical');
  const { success: notifySuccess, error: notifyError } = useNotify;
  const { user } = useAuthStore();
  const activeShopId = user?.shopId;
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const productSearchAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId]?.productSearch : undefined,
  );
  // One subscription for the whole page; each card gets a map lookup by billing mode (Req 10.1).
  const { layoutFor: cardLayoutFor } = useSurfaceCardLayout(CARD_SURFACE_IDS.productSearch);
  const cardVisibility = useMemo(
    () => shopAccessPolicy(productSearchAccess),
    [productSearchAccess],
  );

  const isLoading = search.isFetching;
  const inventory = useMemo(
    () => (search.result?.data ?? []).map((item) => patched[item.id ?? ''] ?? item),
    [search.result, patched],
  );
  const totalItems = search.result?.page.totalItems ?? 0;
  const totalPages = search.result?.page.totalPages ?? 0;
  const pageStart = totalItems === 0 ? 0 : search.state.page * search.state.size + 1;
  const pageEnd = Math.min(totalItems, pageStart + inventory.length - 1);

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

  /** After a cart change the stock on screen may be stale: refetch the current page in place. */
  const refreshResults = () => {
    void queryClient.invalidateQueries({ queryKey: productKeys.searches() });
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
      setSelectedItem({
        ...full,
        availableCount: item.availableCount,
        availableBaseCount: item.availableBaseCount,
      });
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load product details');
      setSelectedItem(null);
    } finally {
      setDetailLoadingId(null);
    }
  };

  const addItemToCartDocument = async (
    item: InventoryItem,
    purchaseId: string,
    quantity = pendingQuantity,
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
          quantity: Math.max(1, Math.floor(quantity)),
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

  const notifyAddedToEstimate = (item: InventoryItem, estimate?: EstimateSummary) => {
    const productName = item.name || 'Product';
    if (estimate) {
      const who = estimate.estimateNo?.trim() || estimate.customerName;
      notifySuccess(`Added "${productName}" to estimate ${who}`);
    } else {
      notifySuccess(`Added "${productName}" to a new estimate`);
    }
  };

  const handleAddToCartDocumentError = (err: unknown, kind: 'quotation' | 'estimate') => {
    const errorMessage = err instanceof Error ? err.message : `Failed to add item to ${kind}`;
    if (errorMessage.includes('Cannot mix REGULAR and BASIC inventory items in a single cart')) {
      notifyError(
        `Cannot add this item because the ${kind} already contains a different billing mode (REGULAR/BASIC). Pick another ${kind} or clear that cart.`,
      );
    } else {
      notifyError(errorMessage);
    }
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
      await addItemToCartDocument(item, purchaseId);
      rememberOpenQuotationId(purchaseId);
      const quotation = quotations.find((q) => q.purchaseId === purchaseId);
      notifyAddedToQuotation(item, quotation);
      setQuotationPickerItem(null);
      refreshResults();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      handleAddToCartDocumentError(err, 'quotation');
    } finally {
      setAddingToCart(null);
    }
  };

  const commitAddToEstimate = async (
    item: InventoryItem,
    purchaseId: string,
    estimates: EstimateSummary[],
  ) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      return;
    }
    setAddingToCart(inventoryId);
    setError(null);
    setSuccessMessage(null);
    try {
      await addItemToCartDocument(item, purchaseId);
      const estimate = estimates.find((e) => e.purchaseId === purchaseId);
      notifyAddedToEstimate(item, estimate);
      setEstimatePickerItem(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      handleAddToCartDocumentError(err, 'estimate');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleAddToCart = (item: InventoryItem, quantity: number) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      notifyError('Cannot add: missing inventory id');
      return;
    }
    if (getShopAvailableBaseCount(item) <= 0) {
      notifyError('Product is out of stock');
      return;
    }
    const effectivePrice = item.sellingPrice ?? item.priceToRetail;
    if (effectivePrice == null) {
      notifyError('Cannot add: product price is not set');
      return;
    }
    setPendingQuantity(Math.max(1, Math.floor(quantity)));
    setDestinationPickerItem(item);
  };

  const handleDestinationSelect = async (destination: CartDestination) => {
    const item = destinationPickerItem;
    if (!item) {
      return;
    }
    setDestinationPickerItem(null);
    if (destination === 'sell') {
      await handleAddToSell(item);
      return;
    }
    await handleAddToEstimate(item);
  };

  const handleAddToSell = async (item: InventoryItem) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      notifyError('Cannot add: missing inventory id');
      return;
    }
    if (getShopAvailableBaseCount(item) <= 0) {
      notifyError('Product is out of stock');
      return;
    }

    const effectivePrice = item.sellingPrice ?? item.priceToRetail;
    if (effectivePrice == null) {
      notifyError('Cannot add: product price is not set');
      return;
    }

    setError(null);
    try {
      const list = (await cartApi.listQuotations()).quotations;
      setQuotationPickerList(list);
      setQuotationPickerItem(item);
    } catch (err) {
      handleAddToCartDocumentError(err, 'quotation');
      setDestinationPickerItem(item);
    }
  };

  const handleAddToEstimate = async (item: InventoryItem) => {
    const inventoryId = resolveInventoryDocumentId(item);
    if (!inventoryId) {
      notifyError('Cannot add: missing inventory id');
      return;
    }
    if (getShopAvailableBaseCount(item) <= 0) {
      notifyError('Product is out of stock');
      return;
    }

    const effectivePrice = item.sellingPrice ?? item.priceToRetail;
    if (effectivePrice == null) {
      notifyError('Cannot add: product price is not set');
      return;
    }

    setError(null);
    try {
      const list = (await estimatesApi.list('OPEN', { size: 100 })).estimates;
      setEstimatePickerList(list);
      setEstimatePickerItem(item);
    } catch (err) {
      handleAddToCartDocumentError(err, 'estimate');
      setDestinationPickerItem(item);
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
      handleAddToCartDocumentError(err, 'quotation');
      setAddingToCart(null);
    }
  };

  const handleEstimatePickerSelect = async (purchaseId: string) => {
    if (!estimatePickerItem) {
      return;
    }
    await commitAddToEstimate(estimatePickerItem, purchaseId, estimatePickerList);
  };

  const handleEstimatePickerNew = async () => {
    if (!estimatePickerItem) {
      return;
    }
    const inventoryId = resolveInventoryDocumentId(estimatePickerItem);
    if (!inventoryId) {
      return;
    }
    setAddingToCart(inventoryId);
    try {
      const cart = await estimatesApi.create({
        businessType: cartBusinessType,
      });
      const list = (await estimatesApi.list('OPEN', { size: 100 })).estimates;
      setEstimatePickerList(list);
      await commitAddToEstimate(estimatePickerItem, cart.purchaseId, list);
    } catch (err) {
      handleAddToCartDocumentError(err, 'estimate');
      setAddingToCart(null);
    }
  };

  return (
    <Stack gap="md">
      <PageHeader description="Search by name, company, barcode, HSN or batch, narrow down with the filters, then press Search" />

      <Box className={surfaceChrome.searchFilterBar}>
        <Box className={surfaceChrome.searchFilterGrow}>
          <SearchInput
            grow
            flush
            buttonVariant="solid"
            leadingIcon={<Icon icon={Search} size="sm" />}
            value={search.textInput}
            onChange={search.setTextInput}
            onSearch={search.submit}
            showSearchButton
            placeholder="Search by name, company, barcode, HSN or batch"
            disabled={search.fieldsLoading}
            searchLabel={isLoading ? 'Searching…' : 'Search'}
          />
        </Box>
        <Box className={surfaceChrome.searchFilterDivider} aria-hidden />
        <Switch
          label="Include dump stock"
          checked={search.state.includeZeroStock}
          onChange={(e) => search.changeIncludeZeroStock(e.target.checked)}
          disabled={search.fieldsLoading}
        />
      </Box>

      <SearchFilterStrip
        fields={search.fields}
        state={search.state}
        facets={search.facets}
        onChange={search.applyPanel}
        pinned={search.pinned}
        onPin={search.pin}
        onUnpin={search.unpin}
        disabled={search.fieldsLoading}
        end={
          <SortSelect
            fields={search.fields}
            value={search.state.sort}
            defaultSort={search.defaultSort}
            onChange={search.changeSort}
            disabled={search.fieldsLoading}
          />
        }
      />

      <ActiveFilterChips
        filters={search.state.filters}
        fields={search.fields}
        match={search.state.match}
        onRemove={search.removeFilter}
        onClearAll={search.clearAllFilters}
        onMatchChange={search.changeMatch}
        disabled={search.fieldsLoading}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      {search.error ? (
        <Alert variant="danger">
          <Inline gap="sm" align="center" justify="between" width="full">
            <Text as="span">{search.error.message || 'The search failed.'}</Text>
            <Button variant="outline" size="sm" onClick={search.retry}>
              Retry
            </Button>
          </Inline>
        </Alert>
      ) : null}

      {search.mode === 'settingUp' ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Set up your search"
              description="Pick filters above, type a name, or both — then press Search. Leave the box empty to browse everything that matches the filters."
              action={
                <Button variant="solid" onClick={search.submit}>
                  Search
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="caption" color="secondary" aria-live="polite">
                {search.isLoading
                  ? 'Searching…'
                  : totalItems === 0
                  ? 'No results'
                  : `Showing ${pageStart.toLocaleString()}–${pageEnd.toLocaleString()} of ${totalItems.toLocaleString()} ${
                      totalItems === 1 ? 'result' : 'results'
                    }${isLoading ? ' · updating…' : ''}`}
              </Text>

              {search.isLoading && inventory.length === 0 ? (
                <CenteredLoader label="Searching…" />
              ) : inventory.length === 0 && !isLoading ? (
                <EmptyState
                  title="Nothing matches"
                  description="Try fewer filters or a shorter word."
                  action={
                    <Inline gap="sm">
                      {search.state.filters.length > 0 ? (
                        <Button variant="outline" onClick={search.clearAllFilters}>
                          Clear filters
                        </Button>
                      ) : null}
                      <Button variant="ghost" onClick={search.reset}>
                        Start over
                      </Button>
                    </Inline>
                  }
                />
              ) : (
                <>
                  <Box
                    display="grid"
                    gap="lg"
                    width="full"
                    className={cn(surfaceChrome.autoGrid280, isLoading && surfaceChrome.busyDim)}
                    aria-busy={isLoading}
                  >
                    {inventory.map((item) => {
                      const inventoryId = resolveInventoryDocumentId(item);
                      return (
                        <ProductSearchCard
                          key={item.id || item.lotId}
                          item={item}
                          layout={cardLayoutFor(item)}
                          visibility={cardVisibility}
                          isPageLoading={isLoading}
                          isDetailLoading={detailLoadingId === inventoryId}
                          isAddingToCart={addingToCart === inventoryId}
                          onViewDetails={openProductDetails}
                          onAddToCart={handleAddToCart}
                        />
                      );
                    })}
                  </Box>
                  <PaginationBar
                    page={search.state.page}
                    totalPages={Math.max(totalPages, 1)}
                    totalItems={totalItems}
                    disabled={isLoading}
                    onPageChange={search.changePage}
                    pageSize={search.state.size}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageSizeChange={search.changePageSize}
                    aria-label="Product search results pages"
                  />
                </>
              )}
            </Stack>
          </CardBody>
        </Card>
      )}

      <InventoryAlertDetails
        open={selectedItem !== null}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        editable
        productSearchAccess={productSearchAccess}
        onUpdated={(updated) => {
          if (updated.id) setPatched((prev) => ({ ...prev, [updated.id as string]: updated }));
          setSelectedItem(updated);
        }}
      />
      <AddToCartDestinationPicker
        open={destinationPickerItem !== null}
        productLabel={destinationPickerItem?.name || 'this product'}
        isSubmitting={
          destinationPickerItem !== null &&
          addingToCart === resolveInventoryDocumentId(destinationPickerItem)
        }
        onSelect={(destination) => void handleDestinationSelect(destination)}
        onCancel={() => {
          if (addingToCart) return;
          setDestinationPickerItem(null);
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
          setQuotationPickerList([]);
        }}
        onBack={() => {
          if (addingToCart) return;
          const item = quotationPickerItem;
          setQuotationPickerItem(null);
          setQuotationPickerList([]);
          if (item) {
            setDestinationPickerItem(item);
          }
        }}
      />
      <AddToEstimatePicker
        open={estimatePickerItem !== null}
        productLabel={estimatePickerItem?.name || 'this product'}
        estimates={estimatePickerList}
        isSubmitting={
          estimatePickerItem !== null &&
          addingToCart === resolveInventoryDocumentId(estimatePickerItem)
        }
        onSelect={(purchaseId) => void handleEstimatePickerSelect(purchaseId)}
        onNewEstimate={() => void handleEstimatePickerNew()}
        onCancel={() => {
          if (addingToCart) return;
          setEstimatePickerItem(null);
          setEstimatePickerList([]);
        }}
        onBack={() => {
          if (addingToCart) return;
          const item = estimatePickerItem;
          setEstimatePickerItem(null);
          setEstimatePickerList([]);
          if (item) {
            setDestinationPickerItem(item);
          }
        }}
      />
    </Stack>
  );
}
