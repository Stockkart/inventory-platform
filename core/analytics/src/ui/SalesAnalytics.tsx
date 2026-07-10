import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Checkbox,
  FormField,
  Inline,
  Input,
  Select,
  Stack,
} from '@inventory-platform/ui-kit';
import { useSalesAnalyticsQuery } from '../queries/hooks';
import styles from './analytics.module.css';
import { SummaryCards } from './SummaryCards';
import { RevenueChart } from './RevenueChart';
import { TopProductsChart } from './TopProductsChart';
import { SalesByGroupChart } from './SalesByGroupChart';
import { SalesByGroupPieChart } from './SalesByGroupPieChart';
import { ComparisonMetrics } from './ComparisonMetrics';

const GROUP_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'product', label: 'Product' },
  { value: 'lotId', label: 'Lot ID' },
  { value: 'company', label: 'Company' },
] as const;

const TIME_SERIES_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

export function SalesAnalytics() {
  const [localFilters, setLocalFilters] = useState<{
    startDate: string;
    endDate: string;
    groupBy: 'product' | 'lotId' | 'company' | null;
    timeSeries: 'hour' | 'day' | 'week' | 'month' | null;
    topN: number;
    compare: boolean;
  }>({
    startDate: '',
    endDate: '',
    groupBy: null,
    timeSeries: 'week',
    topN: 10,
    compare: true,
  });

  const salesParams = useMemo(
    () => ({
      startDate: localFilters.startDate,
      endDate: localFilters.endDate,
      groupBy: localFilters.groupBy,
      timeSeries: localFilters.timeSeries,
      topN: localFilters.topN,
      compare: localFilters.compare,
    }),
    [localFilters],
  );

  const {
    data,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useSalesAnalyticsQuery(salesParams);

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch analytics'
    : null;

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

  const handleFilterChange = (key: string, value: string | number | boolean | null) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    void refetch();
  };

  return (
    <Stack gap="md">
      <Card>
        <CardBody>
          <Inline gap="md">
            <FormField label="Start Date" htmlFor="startDate">
              <Input
                id="startDate"
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

            <FormField label="End Date" htmlFor="endDate">
              <Input
                id="endDate"
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

            <FormField label="Group By" htmlFor="groupBy">
              <Select
                id="groupBy"
                value={localFilters.groupBy || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange(
                    'groupBy',
                    value === '' ? null : (value as 'product' | 'lotId' | 'company'),
                  );
                }}
                options={[...GROUP_BY_OPTIONS]}
              />
            </FormField>

            <FormField label="Time Series" htmlFor="timeSeries">
              <Select
                id="timeSeries"
                value={localFilters.timeSeries || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange(
                    'timeSeries',
                    value === '' ? null : (value as 'hour' | 'day' | 'week' | 'month'),
                  );
                }}
                options={[...TIME_SERIES_OPTIONS]}
              />
            </FormField>

            <FormField label="Top N" htmlFor="topN">
              <Input
                id="topN"
                type="number"
                min={1}
                max={50}
                value={localFilters.topN}
                onChange={(e) => handleFilterChange('topN', parseInt(e.target.value, 10))}
              />
            </FormField>

            <Checkbox
              id="compare"
              label="Compare with Previous Period"
              checked={localFilters.compare}
              onChange={(e) => handleFilterChange('compare', e.target.checked)}
            />

            <Button variant="solid" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </Inline>
        </CardBody>
      </Card>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? <CenteredLoader label="Loading analytics data…" size="md" /> : null}

      {data && !isLoading ? (
        <>
          <SummaryCards data={data} />
          {data.periodComparison ? <ComparisonMetrics data={data} /> : null}
          <Stack gap="md">
            {data.timeSeries && data.timeSeries.length > 0 ? (
              <Card className={styles.chartCard}>
                <CardBody>
                  <RevenueChart data={data.timeSeries} />
                </CardBody>
              </Card>
            ) : null}
            <Card className={styles.chartCard}>
              <CardBody>
                <TopProductsChart data={data.topProducts} />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <SalesByGroupChart data={data.salesByProduct} groupBy="product" />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <SalesByGroupChart data={data.salesByLotId} groupBy="lotId" />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <SalesByGroupChart data={data.salesByCompany} groupBy="company" />
              </CardBody>
            </Card>
          </Stack>

          <Stack gap="md">
            <Card className={styles.chartCard}>
              <CardBody>
                <SalesByGroupPieChart
                  data={data.salesByProduct}
                  groupBy="product"
                  showRevenue={true}
                />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <SalesByGroupPieChart data={data.salesByLotId} groupBy="lotId" showRevenue={true} />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <SalesByGroupPieChart
                  data={data.salesByCompany}
                  groupBy="company"
                  showRevenue={true}
                />
              </CardBody>
            </Card>
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}
