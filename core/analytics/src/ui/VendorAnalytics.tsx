import { useEffect, useMemo, useState } from 'react';
import { useVendorAnalyticsQuery } from '../queries/hooks';
import styles from './analytics.module.css';

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
    [localFilters]
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
    <div>
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="vendorStartDate">Start Date</label>
          <input
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
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="vendorEndDate">End Date</label>
          <input
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
          <p>Loading vendor analytics data...</p>
        </div>
      )}

      {/* Vendor Analytics Content */}
      {vendorData && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Total Vendors</span>
              </div>
              <div className={styles.summaryValue}>{vendorData.totalVendors}</div>
              <div className={styles.summaryPeriod}>Active Vendors</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Total Inventory Value</span>
              </div>
              <div className={styles.summaryValue}>{formatCurrency(vendorData.totalInventoryValue)}</div>
              <div className={styles.summaryPeriod}>Current Stock Value</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Total Revenue</span>
              </div>
              <div className={styles.summaryValue}>{formatCurrency(vendorData.totalRevenue)}</div>
              <div className={styles.summaryPeriod}>Revenue Generated</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Total Expired Stock Value</span>
              </div>
              <div className={styles.summaryValue}>{formatCurrency(vendorData.totalExpiredStockValue)}</div>
              <div className={styles.summaryPeriod}>Expired Inventory</div>
            </div>

            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>Total Unsold Stock Value</span>
              </div>
              <div className={styles.summaryValue}>{formatCurrency(vendorData.totalUnsoldStockValue)}</div>
              <div className={styles.summaryPeriod}>Unsold Inventory</div>
            </div>
          </div>

          {/* Vendor Stock Analytics Table */}
          {vendorData.vendorStockAnalytics && vendorData.vendorStockAnalytics.length > 0 && (
            <div className={styles.accordionItem}>
              <button
                className={styles.accordionHeader}
                onClick={() => toggleSection('stockAnalytics')}
                aria-expanded={expandedSections.stockAnalytics}
              >
                <span className={styles.accordionTitle}>
                  Vendor Stock Analytics
                  <span className={styles.accordionCount}>({vendorData.vendorStockAnalytics.length})</span>
                </span>
                <span className={`${styles.accordionIcon} ${expandedSections.stockAnalytics ? styles.accordionIconExpanded : ''}`}>
                  ▼
                </span>
              </button>
              <div className={`${styles.accordionContent} ${expandedSections.stockAnalytics ? styles.accordionContentExpanded : ''}`}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Company</th>
                        <th>Inventory Received</th>
                        <th>Quantity Sold</th>
                        <th>Unsold Stock</th>
                        <th>Expired Stock</th>
                        <th>Sell Through %</th>
                        <th>Revenue</th>
                        <th>Unsold Value</th>
                        <th>Expired Value</th>
                        <th>Products</th>
                        <th>Lots</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorData.vendorStockAnalytics.map((vendor) => (
                        <tr key={vendor.vendorId}>
                          <td>{vendor.vendorName}</td>
                          <td>{vendor.vendorCompanyName || 'N/A'}</td>
                          <td>{vendor.totalInventoryReceived}</td>
                          <td>{vendor.totalQuantitySold}</td>
                          <td>{vendor.totalUnsoldStock}</td>
                          <td>{vendor.totalExpiredStock}</td>
                          <td>{formatPercentage(vendor.sellThroughPercentage)}</td>
                          <td>{formatCurrency(vendor.revenueGenerated)}</td>
                          <td>{formatCurrency(vendor.unsoldStockValue)}</td>
                          <td>{formatCurrency(vendor.expiredStockValue)}</td>
                          <td>{vendor.numberOfProducts}</td>
                          <td>{vendor.numberOfLots}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Revenue Analytics Table */}
          {vendorData.vendorRevenueAnalytics && vendorData.vendorRevenueAnalytics.length > 0 && (
            <div className={styles.accordionItem}>
              <button
                className={styles.accordionHeader}
                onClick={() => toggleSection('revenueAnalytics')}
                aria-expanded={expandedSections.revenueAnalytics}
              >
                <span className={styles.accordionTitle}>
                  Vendor Revenue Analytics
                  <span className={styles.accordionCount}>({vendorData.vendorRevenueAnalytics.length})</span>
                </span>
                <span className={`${styles.accordionIcon} ${expandedSections.revenueAnalytics ? styles.accordionIconExpanded : ''}`}>
                  ▼
                </span>
              </button>
              <div className={`${styles.accordionContent} ${expandedSections.revenueAnalytics ? styles.accordionContentExpanded : ''}`}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Company</th>
                        <th>Total Revenue</th>
                        <th>Total Cost</th>
                        <th>Gross Profit</th>
                        <th>Margin %</th>
                        <th>Items Sold</th>
                        <th>Purchases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorData.vendorRevenueAnalytics.map((vendor) => (
                        <tr key={vendor.vendorId}>
                          <td>{vendor.vendorName}</td>
                          <td>{vendor.vendorCompanyName || 'N/A'}</td>
                          <td>{formatCurrency(vendor.totalRevenue)}</td>
                          <td>{formatCurrency(vendor.totalCost)}</td>
                          <td>{formatCurrency(vendor.grossProfit)}</td>
                          <td>{formatPercentage(vendor.marginPercent)}</td>
                          <td>{vendor.totalItemsSold}</td>
                          <td>{vendor.totalPurchases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Performance Analytics Table */}
          {vendorData.vendorPerformanceAnalytics && vendorData.vendorPerformanceAnalytics.length > 0 && (
            <div className={styles.accordionItem}>
              <button
                className={styles.accordionHeader}
                onClick={() => toggleSection('performanceAnalytics')}
                aria-expanded={expandedSections.performanceAnalytics}
              >
                <span className={styles.accordionTitle}>
                  Vendor Performance Analytics
                  <span className={styles.accordionCount}>({vendorData.vendorPerformanceAnalytics.length})</span>
                </span>
                <span className={`${styles.accordionIcon} ${expandedSections.performanceAnalytics ? styles.accordionIconExpanded : ''}`}>
                  ▼
                </span>
              </button>
              <div className={`${styles.accordionContent} ${expandedSections.performanceAnalytics ? styles.accordionContentExpanded : ''}`}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Company</th>
                        <th>Avg Days in Stock</th>
                        <th>Fast Moving %</th>
                        <th>Dead Stock Value</th>
                        <th>Expired Stock Value</th>
                        <th>Expiry Loss %</th>
                        <th>Expired Items</th>
                        <th>Dead Stock Items</th>
                        <th>Risk Score</th>
                        <th>Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorData.vendorPerformanceAnalytics.map((vendor) => (
                        <tr key={vendor.vendorId}>
                          <td>{vendor.vendorName}</td>
                          <td>{vendor.vendorCompanyName || 'N/A'}</td>
                          <td>{vendor.averageDaysInStock.toFixed(2)}</td>
                          <td>{formatPercentage(vendor.fastMovingItemsPercentage)}</td>
                          <td>{formatCurrency(vendor.deadStockValue)}</td>
                          <td>{formatCurrency(vendor.expiredStockValue)}</td>
                          <td>{formatPercentage(vendor.expiryLossPercentage)}</td>
                          <td>{vendor.totalExpiredItems}</td>
                          <td>{vendor.totalDeadStockItems}</td>
                          <td>{vendor.riskScore.toFixed(5)}</td>
                          <td>
                            <span
                              className={
                                vendor.riskLevel === 'LOW'
                                  ? styles.riskLow
                                  : vendor.riskLevel === 'MEDIUM'
                                  ? styles.riskMedium
                                  : vendor.riskLevel === 'HIGH'
                                  ? styles.riskHigh
                                  : styles.riskCritical
                              }
                            >
                              {vendor.riskLevel}
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

          {/* Vendor Dependency Analytics Table */}
          {vendorData.vendorDependencyAnalytics && vendorData.vendorDependencyAnalytics.length > 0 && (
            <div className={styles.accordionItem}>
              <button
                className={styles.accordionHeader}
                onClick={() => toggleSection('dependencyAnalytics')}
                aria-expanded={expandedSections.dependencyAnalytics}
              >
                <span className={styles.accordionTitle}>
                  Vendor Dependency Analytics
                  <span className={styles.accordionCount}>({vendorData.vendorDependencyAnalytics.length})</span>
                </span>
                <span className={`${styles.accordionIcon} ${expandedSections.dependencyAnalytics ? styles.accordionIconExpanded : ''}`}>
                  ▼
                </span>
              </button>
              <div className={`${styles.accordionContent} ${expandedSections.dependencyAnalytics ? styles.accordionContentExpanded : ''}`}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Company</th>
                        <th>Revenue %</th>
                        <th>Inventory %</th>
                        <th>Products</th>
                        <th>Dependency Score</th>
                        <th>Dependency Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorData.vendorDependencyAnalytics.map((vendor) => (
                        <tr key={vendor.vendorId}>
                          <td>{vendor.vendorName}</td>
                          <td>{vendor.vendorCompanyName || 'N/A'}</td>
                          <td>{formatPercentage(vendor.revenuePercentage)}</td>
                          <td>{formatPercentage(vendor.inventoryPercentage)}</td>
                          <td>{vendor.numberOfProducts}</td>
                          <td>{vendor.dependencyScore.toFixed(2)}</td>
                          <td>
                            <span
                              className={
                                vendor.dependencyLevel === 'LOW'
                                  ? styles.riskLow
                                  : vendor.dependencyLevel === 'MEDIUM'
                                  ? styles.riskMedium
                                  : vendor.dependencyLevel === 'HIGH'
                                  ? styles.riskHigh
                                  : styles.riskCritical
                              }
                            >
                              {vendor.dependencyLevel}
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

          {/* Category Expiry Analytics Table */}
          {vendorData.categoryExpiryAnalytics && vendorData.categoryExpiryAnalytics.length > 0 && (
            <div className={styles.accordionItem}>
              <button
                className={styles.accordionHeader}
                onClick={() => toggleSection('categoryExpiry')}
                aria-expanded={expandedSections.categoryExpiry}
              >
                <span className={styles.accordionTitle}>
                  Category Expiry Analytics
                  <span className={styles.accordionCount}>({vendorData.categoryExpiryAnalytics.length})</span>
                </span>
                <span className={`${styles.accordionIcon} ${expandedSections.categoryExpiry ? styles.accordionIconExpanded : ''}`}>
                  ▼
                </span>
              </button>
              <div className={`${styles.accordionContent} ${expandedSections.categoryExpiry ? styles.accordionContentExpanded : ''}`}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Vendor Name</th>
                        <th>Business Type</th>
                        <th>Total Received</th>
                        <th>Total Expired</th>
                        <th>Expiry Percentage</th>
                        <th>Expired Stock Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorData.categoryExpiryAnalytics.map((category, index) => (
                        <tr key={`${category.vendorId}-${category.businessType}-${index}`}>
                          <td>{category.vendorName}</td>
                          <td>{category.businessType}</td>
                          <td>{category.totalReceived}</td>
                          <td>{category.totalExpired}</td>
                          <td>{formatPercentage(category.expiryPercentage)}</td>
                          <td>{formatCurrency(category.expiredStockValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Key Insights */}
          <div className={styles.chartCard}>
            <h3 className={styles.tableTitle}>Key Insights</h3>
            <div className={styles.insightsGrid}>
              <div className={styles.insightItem}>
                <span className={styles.insightLabel}>Top Vendor Revenue %</span>
                <span className={styles.insightValue}>
                  {formatPercentage(vendorData.topVendorRevenuePercentage)}
                </span>
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightLabel}>Top 3 Vendors Revenue %</span>
                <span className={styles.insightValue}>
                  {formatPercentage(vendorData.top3VendorRevenuePercentage)}
                </span>
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightLabel}>Most Dependent Vendor</span>
                <span className={styles.insightValue}>{vendorData.mostDependentVendorName}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

