import { useEffect, useMemo, useState } from 'react';
import type {
  InventoryItemAnalytics,
  InventoryPagedList,
} from '@inventory-platform/analytics/types';
import {
  Alert,
  Badge,
  Box,
  Button,
  CenteredLoader,
  Checkbox,
  FormField,
  Grid,
  Input,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  chartChrome,
} from '@inventory-platform/ui-kit';
import {
  useExpiryBucketsQuery,
  useInventoryAnalyticsQuery,
  useInventoryItemsPageMutation,
} from '../queries/hooks';
import { AnalyticsCollapsibleSection } from './AnalyticsCollapsibleSection';
import { AnalyticsMetricCard } from './AnalyticsMetricCard';

export function InventoryAnalytics() {
  const [localFilters, setLocalFilters] = useState<{
    includeAll: boolean;
    lowStockThreshold: number;
    deadStockDays: number;
    expiringSoonDays: number;
  }>({
    includeAll: false,
    lowStockThreshold: 10,
    deadStockDays: 60,
    expiringSoonDays: 15,
  });

  const inventoryParams = useMemo(
    () => ({
      includeAll: localFilters.includeAll,
      lowStockThreshold: localFilters.lowStockThreshold,
      deadStockDays: localFilters.deadStockDays,
      expiringSoonDays: localFilters.expiringSoonDays,
    }),
    [localFilters],
  );

  const {
    data: inventoryData,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useInventoryAnalyticsQuery(inventoryParams);

  const { data: expiryBuckets } = useExpiryBucketsQuery({
    expiringSoonDays: localFilters.expiringSoonDays,
  });

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch inventory analytics'
    : null;

  // Rows fetched with "Show more", per list, on top of the first page in inventoryData
  const [moreRows, setMoreRows] = useState<
    Partial<Record<InventoryPagedList, InventoryItemAnalytics[]>>
  >({});
  const [moreError, setMoreError] = useState<{ list: InventoryPagedList; message: string } | null>(
    null,
  );
  const itemsPage = useInventoryItemsPageMutation();
  const [loadingList, setLoadingList] = useState<InventoryPagedList | null>(null);

  // A new answer (filters applied, refetch) starts every list again from its first page
  useEffect(() => {
    setMoreRows({});
    setMoreError(null);
  }, [inventoryData]);

  const rowsOf = (list: InventoryPagedList, first: InventoryItemAnalytics[]) => [
    ...first,
    ...(moreRows[list] ?? []),
  ];

  const showMore = async (list: InventoryPagedList, shown: InventoryItemAnalytics[]) => {
    const size = inventoryData?.meta.listLimit ?? shown.length;
    if (!size) return;
    setLoadingList(list);
    setMoreError(null);
    try {
      const page = await itemsPage.mutateAsync({
        list,
        page: Math.floor(shown.length / size),
        size,
        lowStockThreshold: inventoryParams.lowStockThreshold,
        deadStockDays: inventoryParams.deadStockDays,
        expiringSoonDays: inventoryParams.expiringSoonDays,
      });
      setMoreRows((prev) => {
        const have = new Set(shown.map((row) => row.inventoryId));
        const fresh = page.items.filter((row) => !have.has(row.inventoryId));
        return { ...prev, [list]: [...(prev[list] ?? []), ...fresh] };
      });
    } catch (err) {
      setMoreError({
        list,
        message: err instanceof Error ? err.message : 'Failed to load more items',
      });
    } finally {
      setLoadingList(null);
    }
  };

  const [expandedSections, setExpandedSections] = useState<{
    lowStock: boolean;
    notSelling: boolean;
    expiringSoon: boolean;
    expired: boolean;
    deadStock: boolean;
    allItems: boolean;
  }>({
    lowStock: false,
    notSelling: false,
    expiringSoon: false,
    expired: false,
    deadStock: false,
    allItems: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleFilterChange = (key: string, value: string | number | boolean) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    void refetch();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderInventoryTable = (
    title: string,
    firstPage: InventoryItemAnalytics[] | null | undefined,
    sectionKey: keyof typeof expandedSections,
    showAllColumns = true,
    list?: InventoryPagedList,
  ) => {
    if (!firstPage || firstPage.length === 0) {
      return null;
    }
    const items = list ? rowsOf(list, firstPage) : firstPage;
    const total = (list && inventoryData?.listTotals?.[list]) ?? items.length;

    return (
      <AnalyticsCollapsibleSection
        title={title}
        count={total}
        expanded={expandedSections[sectionKey]}
        onToggle={() => toggleSection(sectionKey)}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Product Name</TableHeaderCell>
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Barcode</TableHeaderCell>
              <TableHeaderCell>Lot ID</TableHeaderCell>
              <TableHeaderCell>Location</TableHeaderCell>
              <TableHeaderCell>Received</TableHeaderCell>
              <TableHeaderCell>Sold</TableHeaderCell>
              <TableHeaderCell>Current</TableHeaderCell>
              <TableHeaderCell>Stock %</TableHeaderCell>
              <TableHeaderCell>Days Since Received</TableHeaderCell>
              <TableHeaderCell>Days Until Expiry</TableHeaderCell>
              {showAllColumns ? (
                <>
                  <TableHeaderCell>Cost Value</TableHeaderCell>
                  <TableHeaderCell>Selling Value</TableHeaderCell>
                  <TableHeaderCell>Potential Profit</TableHeaderCell>
                  <TableHeaderCell>Margin %</TableHeaderCell>
                  <TableHeaderCell>Turnover Ratio</TableHeaderCell>
                  <TableHeaderCell>Received Date</TableHeaderCell>
                  <TableHeaderCell>Expiry Date</TableHeaderCell>
                  <TableHeaderCell>Last Sold</TableHeaderCell>
                </>
              ) : null}
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.inventoryId}>
                <TableCell>{item.productName}</TableCell>
                <TableCell>{item.companyName}</TableCell>
                <TableCell>{item.barcode}</TableCell>
                <TableCell>{item.lotId || 'N/A'}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.receivedCount}</TableCell>
                <TableCell>{item.soldCount}</TableCell>
                <TableCell>{item.currentCount}</TableCell>
                <TableCell>{formatPercentage(item.stockPercentage)}</TableCell>
                <TableCell>{item.daysSinceReceived}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      item.daysUntilExpiry < 0
                        ? 'danger'
                        : item.daysUntilExpiry <= localFilters.expiringSoonDays
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {item.daysUntilExpiry}
                  </Badge>
                </TableCell>
                {showAllColumns ? (
                  <>
                    <TableCell>{formatCurrency(item.costValue)}</TableCell>
                    <TableCell>{formatCurrency(item.retailValue)}</TableCell>
                    <TableCell>{formatCurrency(item.potentialProfit)}</TableCell>
                    <TableCell>{formatPercentage(item.marginPercent)}</TableCell>
                    <TableCell>{item.turnoverRatio.toFixed(2)}</TableCell>
                    <TableCell>{formatDate(item.receivedDate)}</TableCell>
                    <TableCell>{formatDate(item.expiryDate)}</TableCell>
                    <TableCell>
                      {item.lastSoldDate ? formatDate(item.lastSoldDate) : 'Never'}
                    </TableCell>
                  </>
                ) : null}
                <TableCell>
                  <Stack gap="xs">
                    {item.isLowStock ? <Badge variant="warning">Low Stock</Badge> : null}
                    {item.isExpired ? <Badge variant="danger">Expired</Badge> : null}
                    {item.isExpiringSoon && !item.isExpired ? (
                      <Badge variant="warning">Expiring Soon</Badge>
                    ) : null}
                    {item.isDeadStock ? <Badge variant="danger">Dead Stock</Badge> : null}
                    {!item.isLowStock &&
                    !item.isExpired &&
                    !item.isExpiringSoon &&
                    !item.isDeadStock ? (
                      <Badge variant="success">Normal</Badge>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {list && items.length < total ? (
          <Stack gap="sm">
            {moreError?.list === list ? <Alert variant="danger">{moreError.message}</Alert> : null}
            <Button
              variant="outline"
              onClick={() => void showMore(list, items)}
              disabled={loadingList !== null}
            >
              {loadingList === list ? 'Loading…' : `Show more (${items.length} of ${total} shown)`}
            </Button>
          </Stack>
        ) : null}
      </AnalyticsCollapsibleSection>
    );
  };

  return (
    <Stack gap="md">
      <Box className={chartChrome.filterCard}>
        <Box className={chartChrome.filterBody}>
          <Box className={chartChrome.filterGrid}>
            <FormField label="Low Stock %" htmlFor="lowStockThreshold">
              <Input
                id="lowStockThreshold"
                type="number"
                min={0}
                max={100}
                value={localFilters.lowStockThreshold}
                onChange={(e) =>
                  handleFilterChange('lowStockThreshold', parseInt(e.target.value, 10) || 10)
                }
              />
            </FormField>

            <FormField label="Dead Stock Days" htmlFor="deadStockDays">
              <Input
                id="deadStockDays"
                type="number"
                min={0}
                value={localFilters.deadStockDays}
                onChange={(e) =>
                  handleFilterChange('deadStockDays', parseInt(e.target.value, 10) || 60)
                }
              />
            </FormField>

            <FormField label="Expiring Soon Days" htmlFor="expiringSoonDays">
              <Input
                id="expiringSoonDays"
                type="number"
                min={0}
                value={localFilters.expiringSoonDays}
                onChange={(e) =>
                  handleFilterChange('expiringSoonDays', parseInt(e.target.value, 10) || 15)
                }
              />
            </FormField>
          </Box>

          <Box className={chartChrome.filterActions}>
            <Checkbox
              id="includeAllInventory"
              label="Include all items"
              checked={localFilters.includeAll}
              onChange={(e) => handleFilterChange('includeAll', e.target.checked)}
            />
            <Button variant="solid" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Box>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? <CenteredLoader label="Loading inventory analytics data…" size="md" /> : null}

      {inventoryData && !isLoading ? (
        <>
          {expiryBuckets ? (
            <Grid columns={4} gap="md">
              <AnalyticsMetricCard
                label="Expired (extension index)"
                value={String(expiryBuckets.expired)}
              />
              <AnalyticsMetricCard
                label="Within 7 days"
                value={String(expiryBuckets.expiringWithin7Days)}
              />
              <AnalyticsMetricCard
                label={`Within ${expiryBuckets.expiringSoonDays} days`}
                value={String(expiryBuckets.expiringSoonTotal)}
              />
            </Grid>
          ) : null}

          <Grid columns={4} gap="md">
            <AnalyticsMetricCard
              label="Total Products"
              value={String(inventoryData.summary.totalProducts)}
              period="Total Items"
            />
            <AnalyticsMetricCard
              label="Low Stock Products"
              value={String(inventoryData.summary.lowStockProducts)}
              period="Items Below Threshold"
            />
            <AnalyticsMetricCard
              label="Expired Products"
              value={String(inventoryData.summary.expiredProducts)}
              period="Expired Items"
            />
            <AnalyticsMetricCard
              label="Expiring Soon"
              value={String(inventoryData.summary.expiringSoonProducts)}
              period="Items Expiring Soon"
            />
            <AnalyticsMetricCard
              label="Dead Stock"
              value={String(inventoryData.summary.deadStockProducts)}
              period="Dead Stock Items"
            />
            <AnalyticsMetricCard
              label="Total Cost Value"
              value={formatCurrency(inventoryData.summary.totalCostValue)}
              period="Inventory Cost"
            />
            <AnalyticsMetricCard
              label="Total Selling Value"
              value={formatCurrency(inventoryData.summary.totalRetailValue)}
              period="Potential Revenue"
            />
            <AnalyticsMetricCard
              label="Potential Profit"
              value={formatCurrency(inventoryData.summary.totalPotentialProfit)}
              period="Total Profit"
            />
            <AnalyticsMetricCard
              label="Avg Turnover Ratio"
              value={inventoryData.summary.averageTurnoverRatio.toFixed(2)}
              period="Average Ratio"
            />
            <AnalyticsMetricCard
              label="Avg Stock %"
              value={formatPercentage(inventoryData.summary.averageStockPercentage)}
              period="Average Percentage"
            />
          </Grid>

          {renderInventoryTable(
            'Low Stock Items',
            inventoryData.lowStockItems,
            'lowStock',
            true,
            'lowStockItems',
          )}
          {renderInventoryTable(
            'Not Selling Items',
            inventoryData.notSellingItems,
            'notSelling',
            true,
            'notSellingItems',
          )}
          {renderInventoryTable(
            'Expiring Soon Items',
            inventoryData.expiringSoonItems,
            'expiringSoon',
            true,
          )}
          {renderInventoryTable('Expired Items', inventoryData.expiredItems, 'expired', true)}
          {renderInventoryTable(
            'Dead Stock Items',
            inventoryData.deadStockItems,
            'deadStock',
            true,
            'deadStockItems',
          )}
          {renderInventoryTable('All Items', inventoryData.allItems, 'allItems', true, 'allItems')}
        </>
      ) : null}
    </Stack>
  );
}
