import {
  Fragment,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { inventoryApi } from '../api/inventory.api';
import type { InventoryItem, VendorPurchaseInvoiceDetail, VendorPurchaseInvoiceSummary } from '@inventory-platform/product/types';
import styles from './vendor-invoices.module.css';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Grid,
  Inline,
  PageHeader,
  PaginationBar,
  SearchInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import { isVendorReturnEnabled } from '@inventory-platform/routing';
import {
  HistoryListSummary,
  historyRecordListStyles,
  hasActiveHistoryFilters,
  isDateInRange,
  buildVendorInvoiceSearchQuery,
  paginateLocal,
  matchesRegexField,
  VendorInvoiceExpandedBody,
} from '../ui';
import type { HistoryFilters } from '../ui';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/session';

const recordStyles = historyRecordListStyles;

export function meta() {
  return [
    { title: 'Vendor invoices - StockKart' },
    {
      name: 'description',
      content: 'Purchase invoices from vendors and line items',
    },
  ];
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function readInventoryIdentity(item: InventoryItem): string | null {
  const maybeId = (item as InventoryItem & { id?: string | null }).id;
  if (typeof maybeId === 'string' && maybeId.trim() !== '') {
    return maybeId.trim();
  }
  if (typeof item.lotId === 'string' && item.lotId.trim() !== '') {
    return item.lotId.trim();
  }
  return null;
}

function vendorDisplay(row: {
  vendorName?: string | null;
}): string {
  const n = row.vendorName?.trim();
  if (n) return n;
  return 'Unknown vendor';
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <Inline gap="xs">
      <Text variant="caption" color="secondary" weight="semibold">
        {label}:
      </Text>
      <Text variant="caption" color="secondary">
        {value}
      </Text>
    </Inline>
  );
}

function InvoiceExpansionPanel({
  inv,
  detail,
  rowBusy,
  err,
  inventoryById,
  inventoryLoadingByInvoice,
  inventoryWarningByInvoice,
  panelId,
}: {
  inv: VendorPurchaseInvoiceSummary;
  detail: VendorPurchaseInvoiceDetail | undefined;
  rowBusy: boolean;
  err: string | undefined;
  inventoryById: Record<string, InventoryItem>;
  inventoryLoadingByInvoice: Record<string, boolean>;
  inventoryWarningByInvoice: Record<string, string>;
  panelId?: string;
}) {
  const content = (
    <>
      {rowBusy && !detail ? (
        <CenteredLoader label="Loading details…" size="sm" />
      ) : null}
      {err ? <Alert variant="danger">{err}</Alert> : null}
      {detail ? (
        <VendorInvoiceExpandedBody
          detail={detail}
          inventoryById={inventoryById}
          inventoryLoading={inventoryLoadingByInvoice[inv.id] === true}
          inventoryWarning={inventoryWarningByInvoice[inv.id]}
        />
      ) : null}
    </>
  );

  if (panelId) {
    return (
      <Card id={panelId} className={styles.panel}>
        <CardBody>
          <Stack gap="sm">{content}</Stack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Stack gap="sm" className={recordStyles.breakdownWrap}>
      {content}
    </Stack>
  );
}

export type VendorInvoicesPageProps = {
  embedded?: boolean;
  filters?: HistoryFilters;
};

const FILTER_FETCH_SIZE = 100;

export function VendorInvoicesPage({
  embedded = false,
  filters,
}: VendorInvoicesPageProps) {
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined
  );
  const vendorReturnEnabled = isVendorReturnEnabled(shopCapabilities);

  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [listQuery, setListQuery] = useState('');
  const filtering =
    filters != null && hasActiveHistoryFilters(filters, 'purchaseHistory');
  const [filterPage, setFilterPage] = useState(1);
  const embeddedPageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [invoices, setInvoices] = useState<VendorPurchaseInvoiceSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsById, setDetailsById] = useState<
    Record<string, VendorPurchaseInvoiceDetail>
  >({});
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [inventoryById, setInventoryById] = useState<Record<string, InventoryItem>>(
    {}
  );
  const [inventoryLoadingByInvoice, setInventoryLoadingByInvoice] = useState<
    Record<string, boolean>
  >({});
  const [inventoryWarningByInvoice, setInventoryWarningByInvoice] = useState<
    Record<string, string>
  >({});
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setFilterPage(1);
    setPage(0);
  }, [filters]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (filtering && filters) {
        const q = buildVendorInvoiceSearchQuery(filters);
        const res = await inventoryApi.listVendorPurchaseInvoices(
          0,
          FILTER_FETCH_SIZE,
          q
        );
        let rows = res.invoices ?? [];
        rows = rows.filter((inv) =>
          isDateInRange(inv.invoiceDate, filters.dateFrom, filters.dateTo)
        );
        rows = rows.filter((inv) =>
          matchesRegexField(filters.invoiceNo, inv.invoiceNo)
        );
        rows = rows.filter((inv) =>
          matchesRegexField(filters.vendor, vendorDisplay(inv))
        );
        const paged = paginateLocal(rows, filterPage, embeddedPageSize);
        setFilteredTotal(paged.total);
        setInvoices(paged.slice);
        setTotalPages(paged.totalPages);
        setTotalItems(paged.total);
      } else if (embedded) {
        const res = await inventoryApi.listVendorPurchaseInvoices(
          page,
          embeddedPageSize,
          listQuery || undefined
        );
        setInvoices(res.invoices ?? []);
        setTotalPages(res.page?.totalPages ?? 0);
        setTotalItems(res.page?.totalItems ?? 0);
        setFilteredTotal(0);
      } else {
        const res = await inventoryApi.listVendorPurchaseInvoices(
          page,
          size,
          listQuery || undefined
        );
        setInvoices(res.invoices ?? []);
        setTotalPages(res.page?.totalPages ?? 0);
        setTotalItems(res.page?.totalItems ?? 0);
        setFilteredTotal(0);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load vendor invoices'
      );
      setInvoices([]);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [embedded, filterPage, filtering, filters, listQuery, page, size]);

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setExpandedId(null);
  }, [page, filterPage]);

  const runSearch = useCallback(() => {
    const q = searchInput.trim();
    setPage(0);
    setListQuery(q);
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setPage(0);
    setListQuery('');
  }, []);

  const hydrateInventoryForInvoice = useCallback(
    async (
      invoiceId: string,
      detail: VendorPurchaseInvoiceDetail,
      options?: { bypassCache?: boolean }
    ) => {
      const ids = Array.from(
        new Set(
          (detail.lines ?? [])
            .map((line) => line.inventoryId)
            .filter((id): id is string => Boolean(id))
        )
      );
      if (ids.length === 0) return;

      const bypass = options?.bypassCache === true;
      const idsToFetch = bypass
        ? ids
        : ids.filter((id) => !inventoryById[id]);
      if (idsToFetch.length === 0) return;

      setInventoryLoadingByInvoice((prev) => ({ ...prev, [invoiceId]: true }));
      setInventoryWarningByInvoice((prev) => {
        const next = { ...prev };
        delete next[invoiceId];
        return next;
      });

      let failed = 0;
      let fetched: InventoryItem[] = [];
      try {
        fetched = await inventoryApi.getByIds(idsToFetch);
      } catch {
        failed = idsToFetch.length;
      }

      if (fetched.length > 0) {
        setInventoryById((prev) => {
          const next = { ...prev };
          for (let i = 0; i < fetched.length; i += 1) {
            const item = fetched[i];
            const requestedId = idsToFetch[i];
            const identity = readInventoryIdentity(item);
            if (requestedId) {
              // Primary mapping: preserve requested order from bulk response.
              next[requestedId] = item;
            } else if (identity) {
              next[identity] = item;
            }
          }
          return next;
        });
      }

      if (failed === 0) {
        const matchedCount = Math.min(idsToFetch.length, fetched.length);
        failed = idsToFetch.length - matchedCount;
      }

      if (failed > 0) {
        setInventoryWarningByInvoice((prev) => ({
          ...prev,
          [invoiceId]: `${failed} line item(s) could not load inventory details.`,
        }));
      }
      setInventoryLoadingByInvoice((prev) => ({ ...prev, [invoiceId]: false }));
    },
    [inventoryById]
  );

  const toggleExpanded = async (inv: VendorPurchaseInvoiceSummary) => {
    const id = inv.id;
    setError(null);

    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (detailsById[id]) {
      void hydrateInventoryForInvoice(id, detailsById[id]);
      return;
    }

    setFetchingId(id);
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const d = await inventoryApi.getVendorPurchaseInvoice(id);
      setDetailsById((prev) => ({ ...prev, [id]: d }));
      void hydrateInventoryForInvoice(id, d);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Failed to load invoice details';
      setRowError((prev) => ({ ...prev, [id]: msg }));
    } finally {
      setFetchingId(null);
    }
  };

  const pageDescription = vendorReturnEnabled
    ? 'Supplier bills linked to stock-in registrations. Search by product, barcode, invoice number, or vendor name. Expand a row to see line items and totals. To return stock to a supplier, use Return to vendor under Products & Sales.'
    : 'Supplier bills linked to stock-in registrations. Search by product, barcode, invoice number, or vendor name. Expand a row to see line items and totals.';

  const emptyMessage =
    filtering || listQuery
      ? 'No invoices match this search. Try a different pattern or clear the filter.'
      : 'No vendor invoices yet. When you register stock with invoice details, they appear here.';

  const renderEmbeddedCards = () => (
    <Stack gap="md">
      <HistoryListSummary
        page={filtering ? filterPage : page + 1}
        limit={embeddedPageSize}
        total={filtering ? filteredTotal : totalItems}
        filtered={filtering}
        label="purchases"
      />
      <Stack gap="md" className={recordStyles.list}>
        {invoices.map((inv) => {
          const isOpen = expandedId === inv.id;
          const detail = detailsById[inv.id];
          const rowBusy = fetchingId === inv.id;
          const err = rowError[inv.id];

          return (
            <Card key={inv.id} className={recordStyles.recordCard}>
              <CardBody>
                <Stack gap="md">
                  <Inline
                    className={recordStyles.recordHeader}
                    justify="between"
                    align="start"
                    gap="md"
                  >
                    <Inline gap="xs" align="center">
                      <DetailLine label="Invoice" value={inv.invoiceNo} />
                      {inv.synthetic ? <Badge variant="info">Auto</Badge> : null}
                    </Inline>
                    <Inline
                      className={recordStyles.recordActions}
                      gap="sm"
                      align="center"
                    >
                      <DetailLine
                        label="Date"
                        value={formatDateShort(inv.invoiceDate)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => toggleExpanded(inv)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? 'Hide details' : 'View details'}
                      </Button>
                    </Inline>
                  </Inline>
                  <Grid
                    columns={2}
                    gap="sm"
                    className={recordStyles.recordDetails}
                  >
                    <DetailLine label="Vendor" value={vendorDisplay(inv)} />
                    <DetailLine label="Lines" value={String(inv.lineCount)} />
                    <DetailLine
                      label="Total"
                      value={formatMoney(inv.invoiceTotal)}
                    />
                  </Grid>
                  {isOpen ? (
                    <InvoiceExpansionPanel
                      inv={inv}
                      detail={detail}
                      rowBusy={rowBusy}
                      err={err}
                      inventoryById={inventoryById}
                      inventoryLoadingByInvoice={inventoryLoadingByInvoice}
                      inventoryWarningByInvoice={inventoryWarningByInvoice}
                    />
                  ) : null}
                </Stack>
              </CardBody>
            </Card>
          );
        })}
      </Stack>
      <PaginationBar
        page={filtering ? filterPage - 1 : page}
        totalPages={totalPages}
        onPageChange={(p) => {
          if (filtering) setFilterPage(p + 1);
          else setPage(p);
        }}
        aria-label="Invoice pages"
      />
    </Stack>
  );

  const renderStandaloneTable = () => (
    <Stack gap="md">
      <Box className={styles.tableScroll}>
        <Table className={styles.sheet}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Invoice</TableHeaderCell>
              <TableHeaderCell>Vendor</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell className={styles.numericCol}>Lines</TableHeaderCell>
              <TableHeaderCell className={styles.numericCol}>Total</TableHeaderCell>
              <TableHeaderCell className={styles.actionCol}>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((inv) => {
              const isOpen = expandedId === inv.id;
              const detail = detailsById[inv.id];
              const rowBusy = fetchingId === inv.id;
              const err = rowError[inv.id];
              const triggerId = `invoice-trigger-${inv.id}`;
              const panelId = `invoice-panel-${inv.id}`;

              return (
                <Fragment key={inv.id}>
                  <TableRow
                    className={
                      isOpen
                        ? `${styles.dataRow} ${styles.dataRowOpen}`
                        : styles.dataRow
                    }
                  >
                    <TableCell className={styles.cellInvoice}>
                      <Inline gap="xs" align="center">
                        <Text weight="medium">{inv.invoiceNo}</Text>
                        {inv.synthetic ? <Badge variant="info">Auto</Badge> : null}
                      </Inline>
                    </TableCell>
                    <TableCell className={styles.cellStrong}>
                      {vendorDisplay(inv)}
                    </TableCell>
                    <TableCell className={styles.cellMuted}>
                      {formatDateShort(inv.invoiceDate)}
                    </TableCell>
                    <TableCell
                      className={`${styles.numericCol} ${styles.cellMuted}`}
                    >
                      {inv.lineCount}
                    </TableCell>
                    <TableCell
                      className={`${styles.numericCol} ${styles.cellMoney}`}
                    >
                      {formatMoney(inv.invoiceTotal)}
                    </TableCell>
                    <TableCell className={styles.actionCell}>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={styles.expandControl}
                        onClick={() => toggleExpanded(inv)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        id={triggerId}
                      >
                        {isOpen ? 'Hide' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isOpen ? (
                    <TableRow className={styles.detailRow}>
                      <TableCell colSpan={6} className={styles.detailCell}>
                        <InvoiceExpansionPanel
                          inv={inv}
                          detail={detail}
                          rowBusy={rowBusy}
                          err={err}
                          inventoryById={inventoryById}
                          inventoryLoadingByInvoice={inventoryLoadingByInvoice}
                          inventoryWarningByInvoice={inventoryWarningByInvoice}
                          panelId={panelId}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      <PaginationBar
        page={filtering ? filterPage - 1 : page}
        totalPages={totalPages}
        onPageChange={(p) => {
          if (filtering) setFilterPage(p + 1);
          else setPage(p);
        }}
        aria-label="Invoice pages"
      />
    </Stack>
  );

  return (
    <Stack gap="md" className={embedded ? recordStyles.container : styles.page}>
      {!embedded ? (
        <PageHeader
          title="Vendor purchase invoices"
          description={pageDescription}
        />
      ) : null}

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Card className={embedded ? undefined : styles.surface}>
        <CardBody>
          <Stack gap="md">
            {!embedded ? (
              <Stack gap="sm" className={styles.searchBar}>
                <Inline gap="sm" className={styles.searchToolbar}>
                  <SearchInput
                    value={searchInput}
                    onChange={setSearchInput}
                    onSearch={runSearch}
                    showSearchButton
                    placeholder="Product, barcode, invoice no, or vendor"
                    className={styles.searchField}
                  />
                  {listQuery ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSearch}
                    >
                      Clear
                    </Button>
                  ) : null}
                </Inline>
                <Text variant="caption" color="secondary" className={styles.searchHint}>
                  Same pattern is tried against invoice number, vendor name, and each
                  line&apos;s product name and barcode (case-insensitive). Examples:{' '}
                  <Text as="span" className={styles.mono}>
                    paracetamol|dolo
                  </Text>
                  ,{' '}
                  <Text as="span" className={styles.mono}>
                    INV-712
                  </Text>
                  ,{' '}
                  <Text as="span" className={styles.mono}>
                    ^HIMP
                  </Text>
                  . Invalid patterns return an error from the server.
                </Text>
              </Stack>
            ) : null}

            {loading ? (
              <CenteredLoader
                label={
                  embedded ? 'Loading purchase history…' : 'Loading invoices…'
                }
              />
            ) : invoices.length === 0 ? (
              embedded ? (
                <EmptyState
                  title={
                    filtering
                      ? 'No purchases match these filters.'
                      : 'No vendor invoices yet.'
                  }
                />
              ) : (
                <EmptyState title={emptyMessage} />
              )
            ) : embedded ? (
              renderEmbeddedCards()
            ) : (
              renderStandaloneTable()
            )}
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
