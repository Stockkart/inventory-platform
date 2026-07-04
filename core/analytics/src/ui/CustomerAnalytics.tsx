import { useEffect, useMemo, useState } from 'react';
import { useCustomerAnalyticsQuery } from '../queries/hooks';
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

  return (
    <div>
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="customerStartDate">Start Date</label>
          <input
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
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="customerEndDate">End Date</label>
          <input
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
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="topN">Top N</label>
          <input
            id="topN"
            type="number"
            min="1"
            max="100"
            value={localFilters.topN}
            onChange={(e) => handleFilterChange('topN', parseInt(e.target.value, 10) || 10)}
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="includeAll">
            <input
              id="includeAll"
              type="checkbox"
              checked={localFilters.includeAll}
              onChange={(e) => handleFilterChange('includeAll', e.target.checked)}
              className={styles.checkbox}
            />
            Include All Customers
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
          <p>Loading customer analytics data...</p>
        </div>
      )}

      {/* Customer Analytics Content */}
      {customerData && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Total Customers</span>
              </div>
              <div className={styles.summaryValue}>{customerData.summary.totalCustomers}</div>
              <div className={styles.summaryPeriod}>Active Customers</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>New Customers</span>
              </div>
              <div className={styles.summaryValue}>{customerData.summary.newCustomers}</div>
              <div className={styles.summaryPeriod}>
                {formatPercentage(customerData.summary.newCustomerPercentage)} of total
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Returning Customers</span>
              </div>
              <div className={styles.summaryValue}>{customerData.summary.returningCustomers}</div>
              <div className={styles.summaryPeriod}>
                {formatPercentage(customerData.summary.returningCustomerPercentage)} of total
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Avg Purchase Frequency</span>
              </div>
              <div className={styles.summaryValue}>
                {customerData.summary.averagePurchaseFrequency.toFixed(2)}
              </div>
              <div className={styles.summaryPeriod}>Purchases per customer</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Avg Spend per Customer</span>
              </div>
              <div className={styles.summaryValue}>
                {formatCurrency(customerData.summary.averageSpendPerCustomer)}
              </div>
              <div className={styles.summaryPeriod}>Average order value</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Avg Customer Lifetime Value</span>
              </div>
              <div className={styles.summaryValue}>
                {formatCurrency(customerData.summary.averageCustomerLifetimeValue)}
              </div>
              <div className={styles.summaryPeriod}>CLV per customer</div>
            </div>
          </div>

          {/* Top Customers Table */}
          {customerData.topCustomers && customerData.topCustomers.length > 0 && (
            <div className={styles.accordionItem}>
              <button
                className={styles.accordionHeader}
                onClick={() => toggleSection('topCustomers')}
                aria-expanded={expandedSections.topCustomers}
              >
                <span className={styles.accordionTitle}>
                  Top Customers
                  <span className={styles.accordionCount}>({customerData.topCustomers.length})</span>
                </span>
                <span className={`${styles.accordionIcon} ${expandedSections.topCustomers ? styles.accordionIconExpanded : ''}`}>
                  ▼
                </span>
              </button>
              <div className={`${styles.accordionContent} ${expandedSections.topCustomers ? styles.accordionContentExpanded : ''}`}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Total Purchases</th>
                        <th>Total Revenue</th>
                        <th>Avg Order Value</th>
                        <th>Lifetime Value</th>
                        <th>Purchase Frequency</th>
                        <th>First Purchase</th>
                        <th>Last Purchase</th>
                        <th>Days Since Last</th>
                        <th>Repeat Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerData.topCustomers.map((customer, index) => (
                        <tr key={customer.customerId || `customer-${index}`}>
                          <td>{customer.customerName}</td>
                          <td>{customer.customerPhone || 'N/A'}</td>
                          <td>{customer.customerEmail || 'N/A'}</td>
                          <td>{customer.totalPurchases}</td>
                          <td>{formatCurrency(customer.totalRevenue)}</td>
                          <td>{formatCurrency(customer.averageOrderValue)}</td>
                          <td>{formatCurrency(customer.customerLifetimeValue)}</td>
                          <td>{customer.purchaseFrequency}</td>
                          <td>{formatDate(customer.firstPurchaseDate)}</td>
                          <td>{formatDate(customer.lastPurchaseDate)}</td>
                          <td>{customer.daysSinceLastPurchase}</td>
                          <td>
                            <span
                              className={
                                customer.isRepeatCustomer ? styles.riskLow : styles.riskMedium
                              }
                            >
                              {customer.isRepeatCustomer ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* All Customers Table */}
          {customerData.allCustomers && customerData.allCustomers.length > 0 && (
            <div className={styles.accordionItem}>
              <button
                className={styles.accordionHeader}
                onClick={() => toggleSection('allCustomers')}
                aria-expanded={expandedSections.allCustomers}
              >
                <span className={styles.accordionTitle}>
                  All Customers
                  <span className={styles.accordionCount}>({customerData.allCustomers.length})</span>
                </span>
                <span className={`${styles.accordionIcon} ${expandedSections.allCustomers ? styles.accordionIconExpanded : ''}`}>
                  ▼
                </span>
              </button>
              <div className={`${styles.accordionContent} ${expandedSections.allCustomers ? styles.accordionContentExpanded : ''}`}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Total Purchases</th>
                        <th>Total Revenue</th>
                        <th>Avg Order Value</th>
                        <th>Lifetime Value</th>
                        <th>Purchase Frequency</th>
                        <th>First Purchase</th>
                        <th>Last Purchase</th>
                        <th>Days Since Last</th>
                        <th>Repeat Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerData.allCustomers.map((customer, index) => (
                        <tr key={customer.customerId || `all-customer-${index}`}>
                          <td>{customer.customerName}</td>
                          <td>{customer.customerPhone || 'N/A'}</td>
                          <td>{customer.customerEmail || 'N/A'}</td>
                          <td>{customer.totalPurchases}</td>
                          <td>{formatCurrency(customer.totalRevenue)}</td>
                          <td>{formatCurrency(customer.averageOrderValue)}</td>
                          <td>{formatCurrency(customer.customerLifetimeValue)}</td>
                          <td>{customer.purchaseFrequency}</td>
                          <td>{formatDate(customer.firstPurchaseDate)}</td>
                          <td>{formatDate(customer.lastPurchaseDate)}</td>
                          <td>{customer.daysSinceLastPurchase}</td>
                          <td>
                            <span
                              className={
                                customer.isRepeatCustomer ? styles.riskLow : styles.riskMedium
                              }
                            >
                              {customer.isRepeatCustomer ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

