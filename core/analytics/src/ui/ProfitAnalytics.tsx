import { useEffect, useMemo, useState } from 'react';
import { useProfitAnalyticsQuery } from '../queries/hooks';
import styles from './analytics.module.css';
import { ProfitSummaryCards } from './ProfitSummaryCards';
import { ProfitByGroupChart } from './ProfitByGroupChart';
import { ProfitByGroupPieChart } from './ProfitByGroupPieChart';
import { CostPriceTrendsChart } from './CostPriceTrendsChart';
import { DiscountImpactCard } from './DiscountImpactCard';
import { LowMarginProductsTable } from './LowMarginProductsTable';

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
    [localFilters]
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

  // Set default dates (30 days ago to now)
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
    <div>
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="profitStartDate">Start Date</label>
          <input
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
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="profitEndDate">End Date</label>
          <input
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
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="profitGroupBy">Group By</label>
          <select
            id="profitGroupBy"
            value={localFilters.groupBy || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange('groupBy', value === '' ? null : (value as 'product' | 'lotId' | 'businessType'));
            }}
            className={styles.select}
          >
            <option value="">None</option>
            <option value="product">Product</option>
            <option value="lotId">Lot ID</option>
            <option value="businessType">Business Type</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="profitTimeSeries">Time Series</label>
          <select
            id="profitTimeSeries"
            value={localFilters.timeSeries || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange('timeSeries', value === '' ? null : (value as 'hour' | 'day' | 'week' | 'month'));
            }}
            className={styles.select}
          >
            <option value="">None</option>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="lowMarginThreshold">Low Margin Threshold (%)</label>
          <input
            id="lowMarginThreshold"
            type="number"
            min="0"
            max="100"
            value={localFilters.lowMarginThreshold}
            onChange={(e) => handleFilterChange('lowMarginThreshold', parseFloat(e.target.value) || 10)}
            className={styles.input}
          />
        </div>

        <button onClick={handleApplyFilters} className={styles.applyButton}>
          Apply Filters
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className={styles.error}>
          <p>Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={styles.loading}>
          <p>Loading profit analytics data...</p>
        </div>
      )}

      {/* Profit Analytics Content */}
      {profitData && !isLoading && (
        <>
          <ProfitSummaryCards data={profitData} />
          <DiscountImpactCard data={profitData.discountImpact} />
          
          {/* Bar Charts - One per row */}
          <div className={styles.barChartsGrid}>
            {profitData.costPriceTrends && profitData.costPriceTrends.length > 0 && (
              <div className={styles.chartCard}>
                <CostPriceTrendsChart data={profitData.costPriceTrends} />
              </div>
            )}
            <div className={styles.chartCard}>
              <ProfitByGroupChart
                data={profitData.profitByProduct}
                groupBy="product"
              />
            </div>
            <div className={styles.chartCard}>
              <ProfitByGroupChart
                data={profitData.profitByLotId}
                groupBy="lotId"
              />
            </div>
            <div className={styles.chartCard}>
              <ProfitByGroupChart
                data={profitData.profitByBusinessType}
                groupBy="businessType"
              />
            </div>
          </div>

          {/* Pie Charts - Two per row */}
          <div className={styles.pieChartsGrid}>
            <div className={styles.chartCard}>
              <ProfitByGroupPieChart
                data={profitData.profitByProduct}
                groupBy="product"
              />
            </div>
            <div className={styles.chartCard}>
              <ProfitByGroupPieChart
                data={profitData.profitByLotId}
                groupBy="lotId"
              />
            </div>
            <div className={styles.chartCard}>
              <ProfitByGroupPieChart
                data={profitData.profitByBusinessType}
                groupBy="businessType"
              />
            </div>
          </div>

          {/* Low Margin Products Table */}
          {profitData.lowMarginProducts && profitData.lowMarginProducts.length > 0 && (
            <div className={styles.chartCard}>
              <LowMarginProductsTable data={profitData.lowMarginProducts} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

