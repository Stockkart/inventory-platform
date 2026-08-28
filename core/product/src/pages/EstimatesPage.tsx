import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Inline,
  PageHeader,
  PaginationBar,
  SearchInput,
  Stack,
  Text,
  accountingChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { estimatesApi } from '../api/estimates.api';
import { estimateWorkspaceHref, isEstimateWorkspaceSearch } from '../lib/estimatePaths';
import type { EstimateState, EstimateSummary } from '@inventory-platform/product/types';
import { EstimateListCard } from '../ui/EstimateListCard';
import { ScanSellPage } from './ScanSellPage';

type FilterTab = 'OPEN' | 'CONVERTED' | 'ALL';

export function meta() {
  return [
    { title: 'Sell Estimate - StockKart' },
    {
      name: 'description',
      content: 'Create printable estimates and convert them to invoices',
    },
  ];
}

export function EstimatesPage() {
  const [searchParams] = useSearchParams();
  if (isEstimateWorkspaceSearch(searchParams)) {
    return <ScanSellPage forceEstimateMode />;
  }
  return <EstimatesListPage />;
}

function EstimatesListPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotify;
  const [filter, setFilter] = useState<FilterTab>('OPEN');
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state: EstimateState | undefined =
        filter === 'ALL' ? undefined : filter === 'OPEN' ? 'OPEN' : 'CONVERTED';
      const res = await estimatesApi.list(state, {
        q: query || undefined,
        page,
        size: pageSize,
      });
      setEstimates(res.estimates);
      setTotal(res.total ?? res.estimates.length);
      setTotalPages(res.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }, [filter, query, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: Array<{ id: FilterTab; label: string }> = useMemo(
    () => [
      { id: 'OPEN', label: 'Open' },
      { id: 'CONVERTED', label: 'Converted' },
      { id: 'ALL', label: 'All' },
    ],
    [],
  );

  const handleNew = () => {
    navigate(estimateWorkspaceHref({ fresh: true }));
  };

  const handleSearch = () => {
    setQuery(searchInput.trim());
    setPage(0);
  };

  const handleFilterChange = (next: FilterTab) => {
    setFilter(next);
    setPage(0);
  };

  const handleOpen = (estimate: EstimateSummary) => {
    navigate(estimateWorkspaceHref({ purchaseId: estimate.purchaseId }));
  };

  const handleConvert = async (estimate: EstimateSummary) => {
    if (estimate.estimateState !== 'OPEN') return;
    setBusyId(estimate.purchaseId);
    try {
      const result = await estimatesApi.convert(estimate.purchaseId);
      navigate(`/dashboard/scan-sell?purchaseId=${encodeURIComponent(result.salePurchaseId)}`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to convert estimate');
    } finally {
      setBusyId(null);
    }
  };

  const handleDiscard = async (estimate: EstimateSummary) => {
    if (estimate.estimateState !== 'OPEN') return;
    if (!window.confirm(`Discard estimate ${estimate.estimateNo ?? ''}?`)) return;
    setBusyId(estimate.purchaseId);
    try {
      await estimatesApi.discard(estimate.purchaseId);
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to discard estimate');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack gap="md" maxWidth="xl" mx="auto">
      <PageHeader
        title="Sell Estimate"
        description="Build quotes with tax, print them, then convert one-way to an invoice."
        actions={
          <Button type="button" variant="solid" onClick={handleNew}>
            New estimate
          </Button>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Box
        as="nav"
        aria-label="Estimate filters"
        overflow="auto"
        className={accountingChrome.navTabBar}
      >
        <Inline gap="none">
          {tabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant={active ? 'solid' : 'ghost'}
                size="sm"
                aria-selected={active}
                onClick={() => handleFilterChange(tab.id)}
              >
                {tab.label}
              </Button>
            );
          })}
        </Inline>
      </Box>

      <Box flex="1" className={surfaceChrome.minW280} width="full">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          onSearch={handleSearch}
          showSearchButton
          buttonVariant="solid"
          grow
          placeholder="Search by estimate no, customer name, phone, or email…"
          disabled={loading}
          searchLabel={loading ? 'Searching…' : 'Search'}
        />
      </Box>

      <Text as="span" variant="caption" color="secondary">
        {loading ? 'Loading…' : `${total} estimate${total === 1 ? '' : 's'}`}
        {query ? ` matching “${query}”` : null}
      </Text>

      {loading ? (
        <CenteredLoader label="Loading estimates…" />
      ) : estimates.length === 0 ? (
        <EmptyState
          title={query ? 'No matching estimates' : 'No estimates yet'}
          description={
            query
              ? 'Try a different estimate number, customer name, phone, or email.'
              : 'Start a new estimate, add products, print, then convert to an invoice when the customer confirms.'
          }
          action={
            query ? undefined : (
              <Button type="button" variant="solid" onClick={handleNew}>
                New estimate
              </Button>
            )
          }
        />
      ) : (
        <Stack gap="lg">
          {estimates.map((estimate) => (
            <EstimateListCard
              key={estimate.purchaseId}
              estimate={estimate}
              busy={busyId === estimate.purchaseId}
              onEdit={() => handleOpen(estimate)}
              onConvert={() => void handleConvert(estimate)}
              onDiscard={() => void handleDiscard(estimate)}
            />
          ))}
        </Stack>
      )}

      {total > 0 ? (
        <PaginationBar
          page={page}
          totalPages={Math.max(1, totalPages)}
          totalItems={total}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(0);
          }}
          disabled={loading}
          aria-label="Estimate pages"
        />
      ) : null}

      {printTarget ? (
        <PrintInvoiceModal
          isOpen
          onClose={() => setPrintTarget(null)}
          purchaseId={printTarget.purchaseId}
          invoiceNo={printTarget.estimateNo ?? undefined}
          documentLabel="Estimate"
          onError={(message) => notifyError(message)}
          onSuccess={(message) => notifySuccess(message)}
          onInfo={(message) => notifyInfo(message)}
        />
      ) : null}
    </Stack>
  );
}
