import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { inventoryApi } from '@inventory-platform/product/api';
import type { InventoryItem } from '@inventory-platform/product/types';
import {
  Alert,
  Button,
  Inline,
  PageHeader,
  PaginationBar,
  SearchInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './pricing.module.css';

export function meta() {
  return [
    { title: 'Pricing - StockKart' },
    { name: 'description', content: 'Search inventory and update prices' },
  ];
}

function formatMoney(value: number | null | undefined) {
  return value != null ? `₹${value.toFixed(2)}` : '—';
}

export function PricingPage() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const trimmed = query.trim();
      const response = trimmed
        ? await inventoryApi.search(trimmed, page, pageSize)
        : await inventoryApi.getAll(page, pageSize);

      setInventory(response.data ?? []);
      setTotalPages(response.page?.totalPages ?? 0);
      setTotalItems(response.page?.totalItems ?? response.data?.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setQuery(searchInput.trim());
    setPage(0);
  };

  const handleClear = () => {
    setSearchInput('');
    setQuery('');
    setPage(0);
  };

  const itemsWithPricing = inventory.filter((i) => i.pricingId);
  const itemsWithoutPricing = inventory.filter((i) => !i.pricingId);

  return (
    <Stack gap="md">
      <PageHeader
        title="Pricing"
        description="Search inventory and update pricing (table shows effective selling price)"
      />

      <Inline gap="sm" className={styles.searchRow}>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          showSearchButton
          placeholder="Search by name, company, or barcode…"
          disabled={isLoading}
          className={styles.searchInput}
        />
        {searchInput ? (
          <Button type="button" variant="outline" onClick={handleClear} disabled={isLoading}>
            Clear
          </Button>
        ) : null}
      </Inline>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Inline gap="md" className={styles.resultsMeta}>
        <Text color="secondary" variant="caption">
          {isLoading ? 'Loading…' : `${totalItems} item${totalItems === 1 ? '' : 's'} found`}
        </Text>
        {itemsWithoutPricing.length > 0 && itemsWithPricing.length > 0 ? (
          <Text color="secondary" variant="caption">
            {itemsWithoutPricing.length} item(s) without pricing (legacy)
          </Text>
        ) : null}
      </Inline>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Company</TableHeaderCell>
            <TableHeaderCell>Barcode</TableHeaderCell>
            <TableHeaderCell className={styles.numCol}>Selling</TableHeaderCell>
            <TableHeaderCell className={styles.numCol}>MRP</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell className={styles.actionsCol}>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableLoadingRow colSpan={7} label="Loading inventory…" />
          ) : inventory.length === 0 ? (
            <TableEmptyRow
              colSpan={7}
              message={query ? 'No inventory matches your search.' : 'No inventory found.'}
            />
          ) : (
            inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Text weight="medium" className={styles.productName}>
                    {item.name || '—'}
                  </Text>
                </TableCell>
                <TableCell>{item.companyName || '—'}</TableCell>
                <TableCell className={styles.mono}>{item.barcode || '—'}</TableCell>
                <TableCell className={styles.numCol}>
                  {formatMoney(item.sellingPrice ?? item.priceToRetail)}
                </TableCell>
                <TableCell className={styles.numCol}>
                  {formatMoney(item.maximumRetailPrice)}
                </TableCell>
                <TableCell>{item.location || '—'}</TableCell>
                <TableCell className={styles.actionsCol}>
                  {item.pricingId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigate(`/dashboard/price-edit/${item.pricingId}`, {
                          state: {
                            priceToRetail: item.priceToRetail,
                            maximumRetailPrice: item.maximumRetailPrice,
                            productName: item.name,
                            rates: item.rates ?? undefined,
                            defaultRate: item.defaultRate ?? undefined,
                          },
                        })
                      }
                    >
                      Edit price
                    </Button>
                  ) : (
                    <Text color="secondary" variant="caption">
                      No pricing
                    </Text>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {inventory.length > 0 || isLoading ? (
        <PaginationBar
          page={page}
          totalPages={Math.max(totalPages, 1)}
          totalItems={totalItems}
          disabled={isLoading}
          onPageChange={setPage}
          aria-label="Pricing table pages"
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(0);
          }}
        />
      ) : query ? (
        <Inline justify="center">
          <Button type="button" variant="outline" onClick={handleClear}>
            Clear search
          </Button>
        </Inline>
      ) : null}
    </Stack>
  );
}
