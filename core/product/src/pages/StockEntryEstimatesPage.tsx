import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Inline,
  PageHeader,
  PaginationBar,
  Stack,
  Text,
  accountingChrome,
  productChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { stockEntryEstimatesApi } from '../api/stockEntryEstimates.api';
import type {
  StockEntryEstimateState,
  StockEntryEstimateSummary,
} from '@inventory-platform/product/types';
import { ProductEntryPage } from './ProductEntryPage';

type FilterTab = 'OPEN' | 'LOCKED' | 'CONVERTED' | 'ALL';

export function meta() {
  return [
    { title: 'Entry Estimate - StockKart' },
    {
      name: 'description',
      content:
        'Draft stock-in estimates, lock to create estimate-only stock, or convert to tax entry',
    },
  ];
}

function isWorkspaceSearch(params: URLSearchParams): boolean {
  return (
    params.has('estimateId') || params.get('fresh') === '1' || params.get('mode') === 'estimate'
  );
}

export function StockEntryEstimatesPage() {
  const [searchParams] = useSearchParams();
  if (isWorkspaceSearch(searchParams)) {
    return <ProductEntryPage />;
  }
  return <StockEntryEstimatesListPage />;
}

function StockEntryEstimatesListPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const [filter, setFilter] = useState<FilterTab>('OPEN');
  const [estimates, setEstimates] = useState<StockEntryEstimateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state: StockEntryEstimateState | undefined =
        filter === 'ALL'
          ? undefined
          : filter === 'OPEN'
          ? 'OPEN'
          : filter === 'LOCKED'
          ? 'LOCKED'
          : 'CONVERTED';
      const res = await stockEntryEstimatesApi.list({ state, page, size: pageSize });
      setEstimates(res.estimates);
      setTotal(res.total ?? res.estimates.length);
      setTotalPages(res.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entry estimates');
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: Array<{ id: FilterTab; label: string }> = useMemo(
    () => [
      { id: 'OPEN', label: 'Open' },
      { id: 'LOCKED', label: 'Locked' },
      { id: 'CONVERTED', label: 'Converted' },
      { id: 'ALL', label: 'All' },
    ],
    [],
  );

  const handleNew = () => {
    navigate('/dashboard/entry-estimates?fresh=1&mode=estimate');
  };

  const handleOpen = (estimate: StockEntryEstimateSummary) => {
    navigate(
      `/dashboard/entry-estimates?estimateId=${encodeURIComponent(estimate.id)}&mode=estimate`,
    );
  };

  const handleLock = async (estimate: StockEntryEstimateSummary) => {
    if (estimate.state !== 'OPEN' || estimate.itemCount <= 0) return;
    setBusyId(estimate.id);
    try {
      await stockEntryEstimatesApi.lock(estimate.id);
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to lock entry estimate');
    } finally {
      setBusyId(null);
    }
  };

  const handleDiscard = async (estimate: StockEntryEstimateSummary) => {
    if (estimate.state !== 'OPEN') return;
    if (!window.confirm(`Discard entry estimate ${estimate.estimateNo ?? ''}?`)) return;
    setBusyId(estimate.id);
    try {
      await stockEntryEstimatesApi.discard(estimate.id);
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to discard entry estimate');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack gap="md" maxWidth="xl" mx="auto">
      <PageHeader
        title="Entry Estimate"
        description="Draft stock-in without tax. Lock for estimate-only stock, or open a draft and Add tax on that page."
        actions={
          <Button type="button" variant="solid" onClick={handleNew}>
            New entry estimate
          </Button>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Box
        as="nav"
        aria-label="Entry estimate filters"
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
                onClick={() => {
                  setFilter(tab.id);
                  setPage(0);
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Inline>
      </Box>

      <Text as="span" variant="caption" color="secondary">
        {loading ? 'Loading…' : `${total} estimate${total === 1 ? '' : 's'}`}
      </Text>

      {loading ? (
        <CenteredLoader label="Loading entry estimates…" />
      ) : estimates.length === 0 ? (
        <EmptyState
          title="No entry estimates yet"
          description="Draft stock-in without tax. Lock for estimate-only stock, or open a draft and Add tax on that page."
          action={
            <Button type="button" variant="solid" onClick={handleNew}>
              New entry estimate
            </Button>
          }
        />
      ) : (
        <Stack gap="md">
          {estimates.map((estimate) => (
            <Card key={estimate.id} className={productChrome.historyRecordCard}>
              <CardBody>
                <Inline justify="between" align="start" gap="md" wrap>
                  <Stack gap="xs">
                    <Inline gap="sm" align="center">
                      <Text weight="bold">{estimate.estimateNo ?? estimate.id}</Text>
                      <Badge
                        variant={
                          estimate.state === 'OPEN'
                            ? 'success'
                            : estimate.state === 'LOCKED'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {estimate.state}
                      </Badge>
                    </Inline>
                    <Text variant="caption" color="secondary">
                      {estimate.itemCount} item{estimate.itemCount === 1 ? '' : 's'}
                      {estimate.vendorInvoiceNo ? ` · Inv ${estimate.vendorInvoiceNo}` : ''}
                    </Text>
                  </Stack>
                  <Inline gap="xs" wrap>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === estimate.id}
                      onClick={() => handleOpen(estimate)}
                    >
                      {estimate.state === 'OPEN' ? 'Edit' : 'Open'}
                    </Button>
                    {estimate.state === 'OPEN' ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="solid"
                          disabled={busyId === estimate.id || estimate.itemCount <= 0}
                          onClick={() => void handleLock(estimate)}
                        >
                          Lock
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busyId === estimate.id}
                          onClick={() => void handleDiscard(estimate)}
                        >
                          Discard
                        </Button>
                      </>
                    ) : null}
                  </Inline>
                </Inline>
              </CardBody>
            </Card>
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
          aria-label="Entry estimate pages"
        />
      ) : null}
    </Stack>
  );
}
