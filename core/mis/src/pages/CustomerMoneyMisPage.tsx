import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  Inline,
  Input,
  PageHeader,
  Select,
  Stack,
  Text,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type {
  MisCustomerTxnType,
  MisMoneyFilter,
  MisMoneyReportParams,
  MisMoneyReportResponse,
  MisSalesReportResponse,
} from '@inventory-platform/mis/types';
import {
  FILTERABLE_MIS_CUSTOMER_TXN_TYPES,
  MIS_CUSTOMER_TXN_TYPE_LABEL,
  MIS_MONEY_FILTERS,
  MIS_MONEY_FILTER_LABEL,
} from '@inventory-platform/mis/types';
import { misApi } from '../api/mis.api';
import { openOrDownloadPdf, triggerBlobDownload } from '../api/download';
import { MIS_DEFAULT_PAGE_SIZE } from '../model/paging';
import { misRangeForPreset, type MisPeriodPreset } from '../model/period';
import { MisExportButtons } from '../ui/MisExportButtons';
import { CustomerMisTabs, parseCustomerMisTab, type CustomerMisTabId } from '../ui/CustomerMisTabs';
import { CustomerMoneyMisPanel } from '../ui/CustomerMoneyMisPanel';
import { SalesMisPanel } from '../ui/SalesMisPanel';

const TXN_TYPE_OPTIONS: ReadonlyArray<{ value: MisCustomerTxnType; label: string }> =
  FILTERABLE_MIS_CUSTOMER_TXN_TYPES.map((value) => ({
    value,
    label: MIS_CUSTOMER_TXN_TYPE_LABEL[value],
  }));

const ALL_TXN_TYPES = TXN_TYPE_OPTIONS.map((opt) => opt.value);

const MONEY_FILTER_OPTIONS: ReadonlyArray<{ value: MisMoneyFilter; label: string }> =
  MIS_MONEY_FILTERS.map((value) => ({
    value,
    label: MIS_MONEY_FILTER_LABEL[value],
  }));

function toAppliedParams(
  from: string,
  to: string,
  txnTypes: MisCustomerTxnType[],
  moneyFilter: MisMoneyFilter,
  q: string,
): MisMoneyReportParams {
  const allSelected =
    txnTypes.length === ALL_TXN_TYPES.length && ALL_TXN_TYPES.every((t) => txnTypes.includes(t));
  return {
    from,
    to,
    txnTypes: allSelected || txnTypes.length === 0 ? undefined : txnTypes,
    moneyFilter: moneyFilter === 'ALL' ? undefined : moneyFilter,
    q: q.trim() || undefined,
  };
}

export function CustomerMoneyMisPage() {
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseCustomerMisTab(searchParams.get('tab'));
  const initial = misRangeForPreset('month');

  const [preset, setPreset] = useState<MisPeriodPreset>('month');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [txnTypes, setTxnTypes] = useState<MisCustomerTxnType[]>([...ALL_TXN_TYPES]);
  const [moneyFilter, setMoneyFilter] = useState<MisMoneyFilter>('ALL');
  const [qInput, setQInput] = useState('');

  const [applied, setApplied] = useState<MisMoneyReportParams>(() =>
    toAppliedParams(initial.from, initial.to, [...ALL_TXN_TYPES], 'ALL', ''),
  );
  const [moneyPage, setMoneyPage] = useState(0);
  const [salesPage, setSalesPage] = useState(0);
  const [pageSize, setPageSize] = useState(MIS_DEFAULT_PAGE_SIZE);

  const [moneyData, setMoneyData] = useState<MisMoneyReportResponse | null>(null);
  const [salesData, setSalesData] = useState<MisSalesReportResponse | null>(null);
  const [moneyLoading, setMoneyLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  function setTab(next: CustomerMisTabId) {
    setSearchParams(next === 'sales' ? { tab: 'sales' } : {}, { replace: true });
  }

  useEffect(() => {
    if (tab !== 'money') return;
    let cancelled = false;
    (async () => {
      setMoneyLoading(true);
      try {
        const res = await misApi.customerMoney({ ...applied, page: moneyPage, size: pageSize });
        if (!cancelled) setMoneyData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load Customer Money MIS');
        }
      } finally {
        if (!cancelled) setMoneyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, applied, moneyPage, pageSize, notifyError]);

  useEffect(() => {
    if (tab !== 'sales') return;
    let cancelled = false;
    (async () => {
      setSalesLoading(true);
      try {
        const res = await misApi.sales({
          from: applied.from,
          to: applied.to,
          page: salesPage,
          size: pageSize,
        });
        if (!cancelled) setSalesData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load Sales MIS');
        }
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, applied.from, applied.to, salesPage, pageSize, notifyError]);

  const draftParams = useMemo(
    () => toAppliedParams(fromInput, toInput, txnTypes, moneyFilter, qInput),
    [fromInput, toInput, txnTypes, moneyFilter, qInput],
  );

  function applyPreset(next: MisPeriodPreset) {
    setPreset(next);
    if (next === 'custom') return;
    const range = misRangeForPreset(next);
    setFromInput(range.from);
    setToInput(range.to);
    setMoneyPage(0);
    setSalesPage(0);
    setApplied(toAppliedParams(range.from, range.to, txnTypes, moneyFilter, qInput));
  }

  function handleSearch() {
    setMoneyPage(0);
    setSalesPage(0);
    setApplied(draftParams);
  }

  function toggleTxnType(value: MisCustomerTxnType) {
    setTxnTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function handlePageSizeChange(size: number) {
    setMoneyPage(0);
    setSalesPage(0);
    setPageSize(size);
  }

  async function handleDownload(kind: 'excel' | 'pdf') {
    setDownloading(kind);
    try {
      if (kind === 'excel') {
        const result = await misApi.customerMoneyExcel(applied);
        triggerBlobDownload(result.blob, result.filename);
        notifySuccess('Excel downloaded');
      } else if (tab === 'sales') {
        const result = await misApi.salesPdf({ from: applied.from, to: applied.to });
        openOrDownloadPdf(result.blob, result.filename);
        notifySuccess('PDF ready');
      } else {
        const result = await misApi.customerMoneyPdf(applied);
        openOrDownloadPdf(result.blob, result.filename);
        notifySuccess('PDF ready');
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : `Failed to download ${kind.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

  const loading = tab === 'sales' ? salesLoading : moneyLoading;

  return (
    <Stack gap="md">
      <PageHeader
        title="Customer MIS"
        description="Customer ledger and daily sales for the selected period."
        actions={
          <Inline gap="sm" flexWrap>
            {(
              [
                ['today', 'Today'],
                ['week', 'This week'],
                ['month', 'This month'],
                ['custom', 'Custom'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={preset === key ? 'solid' : 'outline'}
                size="sm"
                onClick={() => applyPreset(key)}
                disabled={loading}
              >
                {label}
              </Button>
            ))}
          </Inline>
        }
      />

      <CustomerMisTabs activeTab={tab} onTabChange={setTab} />

      <Card>
        <CardBody>
          <Stack gap="md">
            <Box className={accountingChrome.misFilterRow}>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  From date
                </Text>
                <Input
                  aria-label="From date"
                  type="date"
                  value={fromInput}
                  onChange={(e) => {
                    setPreset('custom');
                    setFromInput(e.target.value);
                  }}
                  className={accountingChrome.misFilterCompact}
                  disabled={loading}
                />
              </Box>
              <Box className={accountingChrome.partiesFilterField}>
                <Text as="span" className={accountingChrome.partiesFilterLabel}>
                  To date
                </Text>
                <Input
                  aria-label="To date"
                  type="date"
                  value={toInput}
                  onChange={(e) => {
                    setPreset('custom');
                    setToInput(e.target.value);
                  }}
                  className={accountingChrome.misFilterCompact}
                  disabled={loading}
                />
              </Box>
              {tab === 'money' ? (
                <>
                  <Box className={accountingChrome.partiesFilterField}>
                    <Text as="span" className={accountingChrome.partiesFilterLabel}>
                      Money filter
                    </Text>
                    <Select
                      id="customer-mis-money-filter"
                      value={moneyFilter}
                      options={MONEY_FILTER_OPTIONS}
                      onChange={(e) => setMoneyFilter(e.target.value as MisMoneyFilter)}
                      disabled={loading}
                      className={accountingChrome.misFilterMoney}
                    />
                  </Box>
                  <Box className={accountingChrome.partiesFilterField}>
                    <Text as="span" className={accountingChrome.partiesFilterLabel}>
                      Search
                    </Text>
                    <Input
                      id="customer-mis-q"
                      type="search"
                      placeholder="Customer, invoice, txn id…"
                      value={qInput}
                      onChange={(e) => setQInput(e.target.value)}
                      disabled={loading}
                      className={accountingChrome.misFilterSearch}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                    />
                  </Box>
                </>
              ) : null}
              <Button
                type="button"
                variant="solid"
                size="sm"
                onClick={handleSearch}
                loading={loading}
                disabled={loading || !fromInput || !toInput}
              >
                Search
              </Button>
              <Box className={accountingChrome.misFilterActions}>
                <MisExportButtons
                  downloading={downloading}
                  disabled={loading}
                  onExcel={() => void handleDownload('excel')}
                  onPdf={() => void handleDownload('pdf')}
                />
              </Box>
            </Box>

            {tab === 'money' ? (
              <Inline gap="md" flexWrap>
                {TXN_TYPE_OPTIONS.map((opt) => (
                  <Checkbox
                    key={opt.value}
                    label={opt.label}
                    checked={txnTypes.includes(opt.value)}
                    onChange={() => toggleTxnType(opt.value)}
                    disabled={loading}
                  />
                ))}
              </Inline>
            ) : null}
          </Stack>
        </CardBody>
      </Card>

      {tab === 'sales' ? (
        <SalesMisPanel
          data={salesData}
          loading={salesLoading}
          page={salesPage}
          pageSize={pageSize}
          onPageChange={setSalesPage}
          onPageSizeChange={handlePageSizeChange}
        />
      ) : (
        <CustomerMoneyMisPanel
          data={moneyData}
          loading={moneyLoading}
          page={moneyPage}
          pageSize={pageSize}
          onPageChange={setMoneyPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </Stack>
  );
}
