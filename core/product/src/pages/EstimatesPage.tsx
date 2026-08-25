import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Inline,
  PageHeader,
  Stack,
  Text,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { estimatesApi } from '../api/estimates.api';
import type { EstimateState, EstimateSummary } from '@inventory-platform/product/types';
import { PrintInvoiceModal } from '../ui/PrintInvoiceModal';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(value?: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

type FilterTab = 'OPEN' | 'CONVERTED' | 'ALL';

export function meta() {
  return [
    { title: 'Estimates - StockKart' },
    {
      name: 'description',
      content: 'Create printable estimates and convert them to invoices',
    },
  ];
}

export function EstimatesPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotify;
  const [filter, setFilter] = useState<FilterTab>('OPEN');
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<EstimateSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state: EstimateState | undefined =
        filter === 'ALL' ? undefined : filter === 'OPEN' ? 'OPEN' : 'CONVERTED';
      const res = await estimatesApi.list(state);
      setEstimates(res.estimates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }, [filter]);

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
    navigate('/dashboard/scan-sell?mode=estimate&fresh=1');
  };

  const handleOpen = (estimate: EstimateSummary) => {
    navigate(
      `/dashboard/scan-sell?mode=estimate&purchaseId=${encodeURIComponent(estimate.purchaseId)}`,
    );
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
        title="Estimates"
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
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </Button>
            );
          })}
        </Inline>
      </Box>

      {loading ? (
        <CenteredLoader label="Loading estimates…" />
      ) : estimates.length === 0 ? (
        <EmptyState
          title="No estimates yet"
          description="Create an estimate from Scan & Sell, tweak amounts, print, then convert to invoice."
          action={
            <Button type="button" variant="solid" onClick={handleNew}>
              New estimate
            </Button>
          }
        />
      ) : (
        <Stack gap="sm">
          {estimates.map((estimate) => {
            const busy = busyId === estimate.purchaseId;
            const isOpen = estimate.estimateState === 'OPEN';
            return (
              <Box key={estimate.purchaseId} border rounded="md" padding="md" bg="elevated">
                <Inline justify="between" align="start" gap="md" flexWrap>
                  <Stack gap="xs">
                    <Inline gap="sm" align="center" flexWrap>
                      <Text weight="semibold">{estimate.estimateNo?.trim() || 'Estimate'}</Text>
                      <Badge variant={isOpen ? 'info' : 'neutral'}>
                        {estimate.estimateState === 'OPEN' ? 'Open' : 'Converted'}
                      </Badge>
                      {estimate.billingMode === 'REGULAR' ? (
                        <Badge variant="neutral">Tax</Badge>
                      ) : estimate.billingMode === 'BASIC' ? (
                        <Badge variant="neutral">Basic</Badge>
                      ) : null}
                    </Inline>
                    <Text variant="body" color="secondary">
                      {estimate.customerName}
                      {estimate.customerPhone ? ` · ${estimate.customerPhone}` : ''}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {estimate.itemCount} item{estimate.itemCount === 1 ? '' : 's'} ·{' '}
                      {formatMoney(estimate.grandTotal)} · Updated {formatDate(estimate.updatedAt)}
                    </Text>
                    {estimate.convertedToPurchaseId ? (
                      <Text variant="caption" color="secondary">
                        Converted — open History for the invoice.
                      </Text>
                    ) : null}
                  </Stack>
                  <Inline gap="sm" flexWrap>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleOpen(estimate)}
                    >
                      {isOpen ? 'Edit' : 'View'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setPrintTarget(estimate)}
                    >
                      Print
                    </Button>
                    {isOpen ? (
                      <>
                        <Button
                          type="button"
                          variant="solid"
                          size="sm"
                          disabled={busy || estimate.itemCount === 0}
                          onClick={() => void handleConvert(estimate)}
                        >
                          {busy ? 'Converting…' : 'Convert to invoice'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleDiscard(estimate)}
                        >
                          Discard
                        </Button>
                      </>
                    ) : null}
                  </Inline>
                </Inline>
              </Box>
            );
          })}
        </Stack>
      )}

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
