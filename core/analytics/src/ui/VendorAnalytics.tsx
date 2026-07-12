import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
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
  Text,
  chartChrome,
  cn,
} from '@inventory-platform/ui-kit';
import { useVendorAnalyticsQuery } from '../queries/hooks';
import { AnalyticsCollapsibleSection, riskLevelBadgeVariant } from './AnalyticsCollapsibleSection';
import { AnalyticsMetricCard } from './AnalyticsMetricCard';

export function VendorAnalytics() {
  const [localFilters, setLocalFilters] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: '',
  });

  const vendorParams = useMemo(
    () => ({
      startDate: localFilters.startDate,
      endDate: localFilters.endDate,
    }),
    [localFilters],
  );

  const {
    data: vendorData,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useVendorAnalyticsQuery(vendorParams);

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch vendor analytics'
    : null;

  const [expandedSections, setExpandedSections] = useState<{
    stockAnalytics: boolean;
    revenueAnalytics: boolean;
    performanceAnalytics: boolean;
    dependencyAnalytics: boolean;
    categoryExpiry: boolean;
  }>({
    stockAnalytics: false,
    revenueAnalytics: false,
    performanceAnalytics: false,
    dependencyAnalytics: false,
    categoryExpiry: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const formatDate = (date: Date) => {
      return date.toISOString();
    };

    setLocalFilters((prev) => ({
      ...prev,
      startDate: prev.startDate || formatDate(startDate),
      endDate: prev.endDate || formatDate(endDate),
    }));
  }, []);

  const handleFilterChange = (key: string, value: string) => {
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

  return (
    <Stack gap="md">
      <Box className={chartChrome.filterCard}>
        <Box className={chartChrome.filterBody}>
          <Box className={chartChrome.filterGrid}>
            <FormField label="Start Date" htmlFor="vendorStartDate">
              <Input
                id="vendorStartDate"
                type="datetime-local"
                value={
                  localFilters.startDate
                    ? new Date(localFilters.startDate).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value).toISOString() : '';
                  handleFilterChange('startDate', date);
                }}
              />
            </FormField>

            <FormField label="End Date" htmlFor="vendorEndDate">
              <Input
                id="vendorEndDate"
                type="datetime-local"
                value={
                  localFilters.endDate
                    ? new Date(localFilters.endDate).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value);
                    date.setHours(23, 59, 59, 999);
                    handleFilterChange('endDate', date.toISOString());
                  } else {
                    handleFilterChange('endDate', '');
                  }
                }}
              />
            </FormField>
          </Box>

          <Box className={cn(chartChrome.filterActions, chartChrome.filterActionsEnd)}>
            <Button variant="solid" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </Box>
        </Box>
      </Box>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? <CenteredLoader label="Loading vendor analytics data…" size="md" /> : null}

      {vendorData && !isLoading ? (
        <>
          <Grid columns={4} gap="md">
            <AnalyticsMetricCard
              label="Total Vendors"
              value={String(vendorData.totalVendors)}
              period="Active Vendors"
            />
            <AnalyticsMetricCard
              label="Total Inventory Value"
              value={formatCurrency(vendorData.totalInventoryValue)}
              period="Current Stock Value"
            />
            <AnalyticsMetricCard
              label="Total Revenue"
              value={formatCurrency(vendorData.totalRevenue)}
              period="Revenue Generated"
            />
            <AnalyticsMetricCard
              label="Total Expired Stock Value"
              value={formatCurrency(vendorData.totalExpiredStockValue)}
              period="Expired Inventory"
            />
            <AnalyticsMetricCard
              label="Total Unsold Stock Value"
              value={formatCurrency(vendorData.totalUnsoldStockValue)}
              period="Unsold Inventory"
            />
          </Grid>

          {vendorData.vendorStockAnalytics && vendorData.vendorStockAnalytics.length > 0 ? (
            <AnalyticsCollapsibleSection
              title="Vendor Stock Analytics"
              count={vendorData.vendorStockAnalytics.length}
              expanded={expandedSections.stockAnalytics}
              onToggle={() => toggleSection('stockAnalytics')}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Vendor Name</TableHeaderCell>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Inventory Received</TableHeaderCell>
                    <TableHeaderCell>Quantity Sold</TableHeaderCell>
                    <TableHeaderCell>Unsold Stock</TableHeaderCell>
                    <TableHeaderCell>Expired Stock</TableHeaderCell>
                    <TableHeaderCell>Sell Through %</TableHeaderCell>
                    <TableHeaderCell>Revenue</TableHeaderCell>
                    <TableHeaderCell>Unsold Value</TableHeaderCell>
                    <TableHeaderCell>Expired Value</TableHeaderCell>
                    <TableHeaderCell>Products</TableHeaderCell>
                    <TableHeaderCell>Lots</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorData.vendorStockAnalytics.map((vendor) => (
                    <TableRow key={vendor.vendorId}>
                      <TableCell>{vendor.vendorName}</TableCell>
                      <TableCell>{vendor.vendorCompanyName || 'N/A'}</TableCell>
                      <TableCell>{vendor.totalInventoryReceived}</TableCell>
                      <TableCell>{vendor.totalQuantitySold}</TableCell>
                      <TableCell>{vendor.totalUnsoldStock}</TableCell>
                      <TableCell>{vendor.totalExpiredStock}</TableCell>
                      <TableCell>{formatPercentage(vendor.sellThroughPercentage)}</TableCell>
                      <TableCell>{formatCurrency(vendor.revenueGenerated)}</TableCell>
                      <TableCell>{formatCurrency(vendor.unsoldStockValue)}</TableCell>
                      <TableCell>{formatCurrency(vendor.expiredStockValue)}</TableCell>
                      <TableCell>{vendor.numberOfProducts}</TableCell>
                      <TableCell>{vendor.numberOfLots}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnalyticsCollapsibleSection>
          ) : null}

          {vendorData.vendorRevenueAnalytics && vendorData.vendorRevenueAnalytics.length > 0 ? (
            <AnalyticsCollapsibleSection
              title="Vendor Revenue Analytics"
              count={vendorData.vendorRevenueAnalytics.length}
              expanded={expandedSections.revenueAnalytics}
              onToggle={() => toggleSection('revenueAnalytics')}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Vendor Name</TableHeaderCell>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Total Revenue</TableHeaderCell>
                    <TableHeaderCell>Total Cost</TableHeaderCell>
                    <TableHeaderCell>Gross Profit</TableHeaderCell>
                    <TableHeaderCell>Margin %</TableHeaderCell>
                    <TableHeaderCell>Items Sold</TableHeaderCell>
                    <TableHeaderCell>Purchases</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorData.vendorRevenueAnalytics.map((vendor) => (
                    <TableRow key={vendor.vendorId}>
                      <TableCell>{vendor.vendorName}</TableCell>
                      <TableCell>{vendor.vendorCompanyName || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(vendor.totalRevenue)}</TableCell>
                      <TableCell>{formatCurrency(vendor.totalCost)}</TableCell>
                      <TableCell>{formatCurrency(vendor.grossProfit)}</TableCell>
                      <TableCell>{formatPercentage(vendor.marginPercent)}</TableCell>
                      <TableCell>{vendor.totalItemsSold}</TableCell>
                      <TableCell>{vendor.totalPurchases}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnalyticsCollapsibleSection>
          ) : null}

          {vendorData.vendorPerformanceAnalytics &&
          vendorData.vendorPerformanceAnalytics.length > 0 ? (
            <AnalyticsCollapsibleSection
              title="Vendor Performance Analytics"
              count={vendorData.vendorPerformanceAnalytics.length}
              expanded={expandedSections.performanceAnalytics}
              onToggle={() => toggleSection('performanceAnalytics')}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Vendor Name</TableHeaderCell>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Avg Days in Stock</TableHeaderCell>
                    <TableHeaderCell>Fast Moving %</TableHeaderCell>
                    <TableHeaderCell>Dead Stock Value</TableHeaderCell>
                    <TableHeaderCell>Expired Stock Value</TableHeaderCell>
                    <TableHeaderCell>Expiry Loss %</TableHeaderCell>
                    <TableHeaderCell>Expired Items</TableHeaderCell>
                    <TableHeaderCell>Dead Stock Items</TableHeaderCell>
                    <TableHeaderCell>Risk Score</TableHeaderCell>
                    <TableHeaderCell>Risk Level</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorData.vendorPerformanceAnalytics.map((vendor) => (
                    <TableRow key={vendor.vendorId}>
                      <TableCell>{vendor.vendorName}</TableCell>
                      <TableCell>{vendor.vendorCompanyName || 'N/A'}</TableCell>
                      <TableCell>{vendor.averageDaysInStock.toFixed(2)}</TableCell>
                      <TableCell>{formatPercentage(vendor.fastMovingItemsPercentage)}</TableCell>
                      <TableCell>{formatCurrency(vendor.deadStockValue)}</TableCell>
                      <TableCell>{formatCurrency(vendor.expiredStockValue)}</TableCell>
                      <TableCell>{formatPercentage(vendor.expiryLossPercentage)}</TableCell>
                      <TableCell>{vendor.totalExpiredItems}</TableCell>
                      <TableCell>{vendor.totalDeadStockItems}</TableCell>
                      <TableCell>{vendor.riskScore.toFixed(5)}</TableCell>
                      <TableCell>
                        <Badge variant={riskLevelBadgeVariant(vendor.riskLevel)}>
                          {vendor.riskLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnalyticsCollapsibleSection>
          ) : null}

          {vendorData.vendorDependencyAnalytics &&
          vendorData.vendorDependencyAnalytics.length > 0 ? (
            <AnalyticsCollapsibleSection
              title="Vendor Dependency Analytics"
              count={vendorData.vendorDependencyAnalytics.length}
              expanded={expandedSections.dependencyAnalytics}
              onToggle={() => toggleSection('dependencyAnalytics')}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Vendor Name</TableHeaderCell>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell>Revenue %</TableHeaderCell>
                    <TableHeaderCell>Inventory %</TableHeaderCell>
                    <TableHeaderCell>Products</TableHeaderCell>
                    <TableHeaderCell>Dependency Score</TableHeaderCell>
                    <TableHeaderCell>Dependency Level</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorData.vendorDependencyAnalytics.map((vendor) => (
                    <TableRow key={vendor.vendorId}>
                      <TableCell>{vendor.vendorName}</TableCell>
                      <TableCell>{vendor.vendorCompanyName || 'N/A'}</TableCell>
                      <TableCell>{formatPercentage(vendor.revenuePercentage)}</TableCell>
                      <TableCell>{formatPercentage(vendor.inventoryPercentage)}</TableCell>
                      <TableCell>{vendor.numberOfProducts}</TableCell>
                      <TableCell>{vendor.dependencyScore.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={riskLevelBadgeVariant(vendor.dependencyLevel)}>
                          {vendor.dependencyLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnalyticsCollapsibleSection>
          ) : null}

          {vendorData.categoryExpiryAnalytics && vendorData.categoryExpiryAnalytics.length > 0 ? (
            <AnalyticsCollapsibleSection
              title="Category Expiry Analytics"
              count={vendorData.categoryExpiryAnalytics.length}
              expanded={expandedSections.categoryExpiry}
              onToggle={() => toggleSection('categoryExpiry')}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Vendor Name</TableHeaderCell>
                    <TableHeaderCell>Business Type</TableHeaderCell>
                    <TableHeaderCell>Total Received</TableHeaderCell>
                    <TableHeaderCell>Total Expired</TableHeaderCell>
                    <TableHeaderCell>Expiry Percentage</TableHeaderCell>
                    <TableHeaderCell>Expired Stock Value</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorData.categoryExpiryAnalytics.map((category, index) => (
                    <TableRow key={`${category.vendorId}-${category.businessType}-${index}`}>
                      <TableCell>{category.vendorName}</TableCell>
                      <TableCell>{category.businessType}</TableCell>
                      <TableCell>{category.totalReceived}</TableCell>
                      <TableCell>{category.totalExpired}</TableCell>
                      <TableCell>{formatPercentage(category.expiryPercentage)}</TableCell>
                      <TableCell>{formatCurrency(category.expiredStockValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AnalyticsCollapsibleSection>
          ) : null}

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text variant="heading4" weight="semibold">
                  Key Insights
                </Text>
                <Grid columns={3} gap="md">
                  <Stack gap="xs" bg="muted" padding="md" rounded="sm">
                    <Text variant="caption" color="secondary">
                      Top Vendor Revenue %
                    </Text>
                    <Text variant="heading4" weight="semibold">
                      {formatPercentage(vendorData.topVendorRevenuePercentage)}
                    </Text>
                  </Stack>
                  <Stack gap="xs" bg="muted" padding="md" rounded="sm">
                    <Text variant="caption" color="secondary">
                      Top 3 Vendors Revenue %
                    </Text>
                    <Text variant="heading4" weight="semibold">
                      {formatPercentage(vendorData.top3VendorRevenuePercentage)}
                    </Text>
                  </Stack>
                  <Stack gap="xs" bg="muted" padding="md" rounded="sm">
                    <Text variant="caption" color="secondary">
                      Most Dependent Vendor
                    </Text>
                    <Text variant="heading4" weight="semibold">
                      {vendorData.mostDependentVendorName}
                    </Text>
                  </Stack>
                </Grid>
              </Stack>
            </CardBody>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}
