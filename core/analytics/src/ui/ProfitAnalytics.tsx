import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  FormField,
  Inline,
  Input,
  Select,
  Stack,
} from '@inventory-platform/ui-kit';
import { useProfitAnalyticsQuery } from '../queries/hooks';
import styles from './analytics.module.css';
import { ProfitSummaryCards } from './ProfitSummaryCards';
import { ProfitByGroupChart } from './ProfitByGroupChart';
import { ProfitByGroupPieChart } from './ProfitByGroupPieChart';
import { CostPriceTrendsChart } from './CostPriceTrendsChart';
import { DiscountImpactCard } from './DiscountImpactCard';
import { LowMarginProductsTable } from './LowMarginProductsTable';

const GROUP_BY_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'product', label: 'Product' },
  { value: 'lotId', label: 'Lot ID' },
  { value: 'businessType', label: 'Business Type' },
] as const;

const TIME_SERIES_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

export function ProfitAnalytics() {
  const [localFilters, setLocalFilters] = useState<{
    startDate: string;
    endDate: string;
    groupBy: 'product' | 'lotId' | 'businessType' | null;
    timeSeries: 'hour' | 'day' | 'week' | 'month' | null;
    lowMarginThreshold: number;
  }>({
    startDate: '',
    endDate: '',
    groupBy: null,
    timeSeries: null,
    lowMarginThreshold: 10,
  });

  const profitParams = useMemo(
    () => ({
      startDate: localFilters.startDate,
      endDate: localFilters.endDate,
      groupBy: localFilters.groupBy,
      timeSeries: localFilters.timeSeries,
      lowMarginThreshold: localFilters.lowMarginThreshold,
    }),
    [localFilters],
  );

  const {
    data: profitData,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useProfitAnalyticsQuery(profitParams);

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch profit analytics'
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

  const handleFilterChange = (key: string, value: string | number | null) => {
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
            <FormField label="Start Date" htmlFor="profitStartDate">
              <Input
                id="profitStartDate"
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

            <FormField label="End Date" htmlFor="profitEndDate">
              <Input
                id="profitEndDate"
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

            <FormField label="Group By" htmlFor="profitGroupBy">
              <Select
                id="profitGroupBy"
                value={localFilters.groupBy || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange(
                    'groupBy',
                    value === '' ? null : (value as 'product' | 'lotId' | 'businessType'),
                  );
                }}
                options={[...GROUP_BY_OPTIONS]}
              />
            </FormField>

            <FormField label="Time Series" htmlFor="profitTimeSeries">
              <Select
                id="profitTimeSeries"
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

            <FormField label="Low Margin Threshold (%)" htmlFor="lowMarginThreshold">
              <Input
                id="lowMarginThreshold"
                type="number"
                min={0}
                max={100}
                value={localFilters.lowMarginThreshold}
                onChange={(e) =>
                  handleFilterChange('lowMarginThreshold', parseFloat(e.target.value) || 10)
                }
              />
            </FormField>

            <Button variant="solid" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </Inline>
        </CardBody>
      </Card>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? <CenteredLoader label="Loading profit analytics data…" size="md" /> : null}

      {profitData && !isLoading ? (
        <>
          <ProfitSummaryCards data={profitData} />
          <DiscountImpactCard data={profitData.discountImpact} />

          <Stack gap="md">
            {profitData.costPriceTrends && profitData.costPriceTrends.length > 0 ? (
              <Card className={styles.chartCard}>
                <CardBody>
                  <CostPriceTrendsChart data={profitData.costPriceTrends} />
                </CardBody>
              </Card>
            ) : null}
            <Card className={styles.chartCard}>
              <CardBody>
                <ProfitByGroupChart data={profitData.profitByProduct} groupBy="product" />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <ProfitByGroupChart data={profitData.profitByLotId} groupBy="lotId" />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <ProfitByGroupChart data={profitData.profitByBusinessType} groupBy="businessType" />
              </CardBody>
            </Card>
          </Stack>

          <Stack gap="md">
            <Card className={styles.chartCard}>
              <CardBody>
                <ProfitByGroupPieChart data={profitData.profitByProduct} groupBy="product" />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <ProfitByGroupPieChart data={profitData.profitByLotId} groupBy="lotId" />
              </CardBody>
            </Card>
            <Card className={styles.chartCard}>
              <CardBody>
                <ProfitByGroupPieChart
                  data={profitData.profitByBusinessType}
                  groupBy="businessType"
                />
              </CardBody>
            </Card>
          </Stack>

          {profitData.lowMarginProducts && profitData.lowMarginProducts.length > 0 ? (
            <Card className={styles.chartCard}>
              <CardBody>
                <LowMarginProductsTable data={profitData.lowMarginProducts} />
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
