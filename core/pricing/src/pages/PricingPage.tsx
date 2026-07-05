import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router';
import { inventoryApi } from '@inventory-platform/product/api';
import type { InventoryItem } from '@inventory-platform/product/types';
import { PaginationBar } from '@inventory-platform/ui-kit';
import styles from '././pricing.module.css';

export function meta() {
  return [
    { title: 'Pricing - StockKart' },
    { name: 'description', content: 'Search inventory and update prices' },
  ];
}

export function PricingPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const fetchInventory = async (
    pageNum = 0,
    size = pageSize,
    query?: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const hasQuery = query != null ? query.trim() : searchQuery.trim();
      const response = hasQuery
        ? await inventoryApi.search(hasQuery, pageNum, size)
        : await inventoryApi.getAll(pageNum, size);

      setInventory(response.data ?? []);
      setTotalPages(response.page?.totalPages ?? 0);
      setTotalItems(response.page?.totalItems ?? response.data?.length ?? 0);
      setPage(response.page?.page ?? pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory(0, 10, '');
  }, []);

  const handleSearch = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    fetchInventory(0, pageSize, searchQuery);
  };

  const handleClear = () => {
    setSearchQuery('');
    setPage(0);
    fetchInventory(0, pageSize, '');
  };

  const handlePageChange = (newPage: number) => {
    const q = searchQuery.trim();
    fetchInventory(newPage, pageSize, q || undefined);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    fetchInventory(0, newSize, searchQuery.trim() || undefined);
  };

  const itemsWithPricing = inventory.filter((i) => i.pricingId);
  const itemsWithoutPricing = inventory.filter((i) => !i.pricingId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pricing</h1>
        <p className={styles.subtitle}>
          Search inventory and update pricing (table shows effective selling price)
        </p>
      </header>

      <section className={styles.searchSection}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <span className={styles.searchIcon} aria-hidden>
            🔍
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, company, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.searchBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </button>
          )}
        </form>
      </section>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <section className={styles.resultsSection}>
        <div className={styles.resultsHeader}>
          <span className={styles.resultsCount}>
            {isLoading
              ? 'Loading...'
              : `${totalItems} item${totalItems === 1 ? '' : 's'} found`}
          </span>
          {itemsWithoutPricing.length > 0 && itemsWithPricing.length > 0 && (
            <span className={styles.legacyHint}>
              {itemsWithoutPricing.length} item(s) without pricing (legacy)
            </span>
          )}
        </div>

        {isLoading && inventory.length === 0 ? (
          <div className={styles.loading}>Loading inventory...</div>
        ) : inventory.length === 0 ? (
          <div className={styles.empty}>
            <p>No inventory found.</p>
            {searchQuery && (
              <button type="button" className={styles.clearBtn} onClick={handleClear}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Company</th>
                    <th>Barcode</th>
                    <th className={styles.numCol}>Selling</th>
                    <th className={styles.numCol}>MRP</th>
                    <th>Location</th>
                    <th className={styles.actionsCol}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className={styles.productName}>
                          {item.name || '—'}
                        </span>
                      </td>
                      <td>{item.companyName || '—'}</td>
                      <td className={styles.mono}>{item.barcode || '—'}</td>
                      <td className={styles.numCol}>
                        {(item.sellingPrice ?? item.priceToRetail) != null
                          ? `₹${(item.sellingPrice ?? item.priceToRetail)!.toFixed(2)}`
                          : '—'}
                      </td>
                      <td className={styles.numCol}>
                        {item.maximumRetailPrice != null
                          ? `₹${item.maximumRetailPrice.toFixed(2)}`
                          : '—'}
                      </td>
                      <td>{item.location || '—'}</td>
                      <td className={styles.actionsCol}>
                        {item.pricingId ? (
                          <Link
                            to={`/dashboard/price-edit/${item.pricingId}`}
                            state={{
                              priceToRetail: item.priceToRetail,
                              maximumRetailPrice: item.maximumRetailPrice,
                              productName: item.name,
                              rates: item.rates ?? undefined,
                              defaultRate: item.defaultRate ?? undefined,
                            }}
                            className={styles.editLink}
                          >
                            Edit price
                          </Link>
                        ) : (
                          <span className={styles.noPricing}>No pricing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              disabled={isLoading}
              onPageChange={handlePageChange}
              aria-label="Pricing table pages"
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </section>
    </div>
  );
}
