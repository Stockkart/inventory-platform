import { useEffect, useMemo, useState } from 'react';
import { useSalesAnalyticsQuery } from '../queries/hooks';
import styles from './analytics.module.css';
import { SummaryCards } from './SummaryCards';
import { RevenueChart } from './RevenueChart';
import { TopProductsChart } from './TopProductsChart';
import { SalesByGroupChart } from './SalesByGroupChart';
import { SalesByGroupPieChart } from './SalesByGroupPieChart';
import { ComparisonMetrics } from './ComparisonMetrics';

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
    [localFilters]
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

  const handleFilterChange = (key: string, value: string | number | boolean | null) => {
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
          <label htmlFor="startDate">Start Date</label>
          <input
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
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="endDate">End Date</label>
          <input
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
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="groupBy">Group By</label>
          <select
            id="groupBy"
            value={localFilters.groupBy || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleFilterChange('groupBy', value === '' ? null : (value as 'product' | 'lotId' | 'company'));
            }}
            className={styles.select}
          >
            <option value="">None</option>
            <option value="product">Product</option>
            <option value="lotId">Lot ID</option>
            <option value="company">Company</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="timeSeries">Time Series</label>
          <select
            id="timeSeries"
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
          <label htmlFor="topN">Top N</label>
          <input
            id="topN"
            type="number"
            min="1"
            max="50"
            value={localFilters.topN}
            onChange={(e) => handleFilterChange('topN', parseInt(e.target.value, 10))}
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="compare">
            <input
              id="compare"
              type="checkbox"
              checked={localFilters.compare}
              onChange={(e) => handleFilterChange('compare', e.target.checked)}
              className={styles.checkbox}
            />
            Compare with Previous Period
          </label>
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
          <p>Loading analytics data...</p>
        </div>
      )}

      {/* Analytics Content */}
      {data && !isLoading && (
        <>
          <SummaryCards data={data} />
          {data.periodComparison && <ComparisonMetrics data={data} />}
          {/* Bar Charts - One per row */}
          <div className={styles.barChartsGrid}>
            {data.timeSeries && data.timeSeries.length > 0 && (
              <div className={styles.chartCard}>
                <RevenueChart data={data.timeSeries} />
              </div>
            )}
            <div className={styles.chartCard}>
              <TopProductsChart data={data.topProducts} />
            </div>
            <div className={styles.chartCard}>
              <SalesByGroupChart
                data={data.salesByProduct}
                groupBy="product"
              />
            </div>
            <div className={styles.chartCard}>
              <SalesByGroupChart
                data={data.salesByLotId}
                groupBy="lotId"
              />
            </div>
            <div className={styles.chartCard}>
              <SalesByGroupChart
                data={data.salesByCompany}
                groupBy="company"
              />
            </div>
          </div>

          {/* Pie Charts - Two per row */}
          <div className={styles.pieChartsGrid}>
            <div className={styles.chartCard}>
              <SalesByGroupPieChart
                data={data.salesByProduct}
                groupBy="product"
                showRevenue={true}
              />
            </div>
            <div className={styles.chartCard}>
              <SalesByGroupPieChart
                data={data.salesByLotId}
                groupBy="lotId"
                showRevenue={true}
              />
            </div>
            <div className={styles.chartCard}>
              <SalesByGroupPieChart
                data={data.salesByCompany}
                groupBy="company"
                showRevenue={true}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

