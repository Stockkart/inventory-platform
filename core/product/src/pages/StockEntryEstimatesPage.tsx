import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  ConfirmDialog,
  EmptyState,
  Inline,
  PageHeader,
  PaginationBar,
  Stack,
  Text,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { stockEntryEstimatesApi } from '../api/stockEntryEstimates.api';
import type {
  StockEntryEstimateState,
  StockEntryEstimateSummary,
} from '@inventory-platform/product/types';
import { StockEntryEstimateListCard } from '../ui/StockEntryEstimateListCard';
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
  const [lockTarget, setLockTarget] = useState<StockEntryEstimateSummary | null>(null);
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

  const handleConvert = (estimate: StockEntryEstimateSummary) => {
    navigate(`/dashboard/product-entry?convertEstimateId=${encodeURIComponent(estimate.id)}`);
  };

  const handleLock = async (estimate: StockEntryEstimateSummary) => {
    if (estimate.state !== 'OPEN' || estimate.itemCount <= 0) return;
    setBusyId(estimate.id);
    try {
      await stockEntryEstimatesApi.lock(estimate.id);
      setLockTarget(null);
      await load();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to lock entry estimate');
    } finally {
      setBusyId(null);
    }
  };

  const handleDiscard = async (estimate: StockEntryEstimateSummary) => {
    if (estimate.state !== 'OPEN' && !estimate.awaitingConversion) return;
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
        description="Draft stock-in. Lock to add estimate-only stock, or fill HSN / CGST / SGST on a draft and convert it to a vendor bill."
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
          description="Draft stock-in. Lock to add estimate-only stock, or fill HSN / CGST / SGST on a draft and convert it to a vendor bill."
          action={
            <Button type="button" variant="solid" onClick={handleNew}>
              New entry estimate
            </Button>
          }
        />
      ) : (
        <Stack gap="md">
          {estimates.map((estimate) => {
            const busy = busyId === estimate.id;
            const actions = estimate.awaitingConversion ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="solid"
                  disabled={busy}
                  onClick={() => handleConvert(estimate)}
                >
                  Convert to invoice
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleDiscard(estimate)}
                >
                  Discard
                </Button>
              </>
            ) : estimate.state === 'OPEN' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => handleOpen(estimate)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="solid"
                  disabled={busy || estimate.itemCount <= 0}
                  onClick={() => setLockTarget(estimate)}
                >
                  Lock
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleDiscard(estimate)}
                >
                  Discard
                </Button>
              </>
            ) : null;
            return (
              <StockEntryEstimateListCard
                key={estimate.id}
                estimate={estimate}
                busy={busy}
                actions={actions}
              />
            );
          })}
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

      <ConfirmDialog
        open={lockTarget != null}
        title={`Lock ${lockTarget?.estimateNo ?? 'this estimate'}?`}
        confirmLabel={busyId && busyId === lockTarget?.id ? 'Locking…' : 'Lock estimate'}
        loading={busyId != null && busyId === lockTarget?.id}
        onCancel={() => {
          if (!busyId) setLockTarget(null);
        }}
        onConfirm={() => {
          if (lockTarget) void handleLock(lockTarget);
        }}
        message={
          lockTarget?.taxable ? (
            <Stack gap="sm">
              <Text>Please acknowledge before locking:</Text>
              <Text>• You won’t be able to edit this estimate after locking.</Text>
              <Text>• Lock: no stock is added yet.</Text>
              <Text>
                • Next, use Convert to invoice to add payment details and complete stock-in against
                a vendor bill.
              </Text>
            </Stack>
          ) : (
            <Stack gap="sm">
              <Text>Please acknowledge before locking:</Text>
              <Text>• You won’t be able to edit this estimate after locking.</Text>
              <Text>• Lock: adds stock for estimate sales only.</Text>
              <Text>
                • To complete stock-in against a vendor bill instead, open the draft, fill HSN /
                CGST / SGST and use Convert to invoice.
              </Text>
            </Stack>
          )
        }
      />
    </Stack>
  );
}
