import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Checkbox,
  FormField,
  Grid,
  Inline,
  Input,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@inventory-platform/ui-kit';
import { useCustomerAnalyticsQuery } from '../queries/hooks';
import { AnalyticsCollapsibleSection } from './AnalyticsCollapsibleSection';
import { AnalyticsMetricCard } from './AnalyticsMetricCard';
import styles from './analytics.module.css';

export function CustomerAnalytics() {
  const [localFilters, setLocalFilters] = useState<{
    startDate: string;
    endDate: string;
    topN: number;
    includeAll: boolean;
  }>({
    startDate: '',
    endDate: '',
    topN: 10,
    includeAll: false,
  });

  const customerParams = useMemo(
    () => ({
      startDate: localFilters.startDate,
      endDate: localFilters.endDate,
      topN: localFilters.topN,
      includeAll: localFilters.includeAll,
    }),
    [localFilters]
  );

  const {
    data: customerData,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useCustomerAnalyticsQuery(customerParams);

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch customer analytics'
    : null;

  const [expandedSections, setExpandedSections] = useState<{
    topCustomers: boolean;
    allCustomers: boolean;
  }>({
    topCustomers: false,
    allCustomers: false,
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

  const renderCustomerTable = (
    customers: NonNullable<typeof customerData>['topCustomers']
  ) => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Customer Name</TableHeaderCell>
          <TableHeaderCell>Phone</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Total Purchases</TableHeaderCell>
          <TableHeaderCell>Total Revenue</TableHeaderCell>
          <TableHeaderCell>Avg Order Value</TableHeaderCell>
          <TableHeaderCell>Lifetime Value</TableHeaderCell>
          <TableHeaderCell>Purchase Frequency</TableHeaderCell>
          <TableHeaderCell>First Purchase</TableHeaderCell>
          <TableHeaderCell>Last Purchase</TableHeaderCell>
          <TableHeaderCell>Days Since Last</TableHeaderCell>
          <TableHeaderCell>Repeat Customer</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {customers?.map((customer, index) => (
          <TableRow key={customer.customerId || `customer-${index}`}>
            <TableCell>{customer.customerName}</TableCell>
            <TableCell>{customer.customerPhone || 'N/A'}</TableCell>
            <TableCell>{customer.customerEmail || 'N/A'}</TableCell>
            <TableCell>{customer.totalPurchases}</TableCell>
            <TableCell>{formatCurrency(customer.totalRevenue)}</TableCell>
            <TableCell>{formatCurrency(customer.averageOrderValue)}</TableCell>
            <TableCell>{formatCurrency(customer.customerLifetimeValue)}</TableCell>
            <TableCell>{customer.purchaseFrequency}</TableCell>
            <TableCell>{formatDate(customer.firstPurchaseDate)}</TableCell>
            <TableCell>{formatDate(customer.lastPurchaseDate)}</TableCell>
            <TableCell>{customer.daysSinceLastPurchase}</TableCell>
            <TableCell>
              <Badge variant={customer.isRepeatCustomer ? 'success' : 'warning'}>
                {customer.isRepeatCustomer ? 'Yes' : 'No'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Stack gap="md">
      <Card className={styles.filters}>
        <CardBody>
          <Inline gap="md" className={styles.filterRow}>
            <FormField label="Start Date" htmlFor="customerStartDate">
              <Input
                id="customerStartDate"
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

            <FormField label="End Date" htmlFor="customerEndDate">
              <Input
                id="customerEndDate"
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

            <FormField label="Top N" htmlFor="customerTopN">
              <Input
                id="customerTopN"
                type="number"
                min={1}
                max={100}
                value={localFilters.topN}
                onChange={(e) =>
                  handleFilterChange('topN', parseInt(e.target.value, 10) || 10)
                }
              />
            </FormField>

            <Checkbox
              id="includeAll"
              label="Include All Customers"
              checked={localFilters.includeAll}
              onChange={(e) => handleFilterChange('includeAll', e.target.checked)}
            />

            <Button variant="solid" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </Inline>
        </CardBody>
      </Card>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? (
        <CenteredLoader label="Loading customer analytics data…" size="md" />
      ) : null}

      {customerData && !isLoading ? (
        <>
          <Grid className={styles.summaryGrid}>
            <AnalyticsMetricCard
              label="Total Customers"
              value={String(customerData.summary.totalCustomers)}
              period="Active Customers"
            />
            <AnalyticsMetricCard
              label="New Customers"
              value={String(customerData.summary.newCustomers)}
              period={`${formatPercentage(customerData.summary.newCustomerPercentage)} of total`}
            />
            <AnalyticsMetricCard
              label="Returning Customers"
              value={String(customerData.summary.returningCustomers)}
              period={`${formatPercentage(customerData.summary.returningCustomerPercentage)} of total`}
            />
            <AnalyticsMetricCard
              label="Avg Purchase Frequency"
              value={customerData.summary.averagePurchaseFrequency.toFixed(2)}
              period="Purchases per customer"
            />
            <AnalyticsMetricCard
              label="Avg Spend per Customer"
              value={formatCurrency(customerData.summary.averageSpendPerCustomer)}
              period="Average order value"
            />
            <AnalyticsMetricCard
              label="Avg Customer Lifetime Value"
              value={formatCurrency(customerData.summary.averageCustomerLifetimeValue)}
              period="CLV per customer"
            />
          </Grid>

          {customerData.topCustomers && customerData.topCustomers.length > 0 ? (
            <AnalyticsCollapsibleSection
              title="Top Customers"
              count={customerData.topCustomers.length}
              expanded={expandedSections.topCustomers}
              onToggle={() => toggleSection('topCustomers')}
            >
              {renderCustomerTable(customerData.topCustomers)}
            </AnalyticsCollapsibleSection>
          ) : null}

          {customerData.allCustomers && customerData.allCustomers.length > 0 ? (
            <AnalyticsCollapsibleSection
              title="All Customers"
              count={customerData.allCustomers.length}
              expanded={expandedSections.allCustomers}
              onToggle={() => toggleSection('allCustomers')}
            >
              {renderCustomerTable(customerData.allCustomers)}
            </AnalyticsCollapsibleSection>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
