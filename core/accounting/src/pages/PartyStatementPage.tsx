import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  PageHeader,
  PaginationBar,
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
  Input,
  cn,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { PartyStatementResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import type { SubsidiaryPartyType } from './PartiesPage';
import { formatDateShort, formatJournalSource, formatMoney, formatTurnover } from '../model/format';

export interface PartyStatementPageProps {
  partyType: SubsidiaryPartyType;
}

const TITLES: Record<SubsidiaryPartyType, { kind: string; back: string; backHref: string }> = {
  VENDOR: {
    kind: 'Vendor',
    back: 'All vendors',
    backHref: '/dashboard/accounting/vendors',
  },
  CUSTOMER: {
    kind: 'Customer',
    back: 'All customers',
    backHref: '/dashboard/accounting/customers',
  },
};

export function PartyStatementPage({ partyType }: PartyStatementPageProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const partyRefId = params.partyRefId ?? '';
  const titles = TITLES[partyType];

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PartyStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!partyRefId) return;
    setLoading(true);
    try {
      const res = await accountingApi.partyStatement(partyType, partyRefId, {
        from: from || undefined,
        to: to || undefined,
        page,
        size: 50,
      });
      setData(res);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [partyType, partyRefId, from, to, page, notifyError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!partyRefId) {
    return (
      <Stack gap="md">
        <Card>
          <CardBody>
            <Stack gap="sm" align="start">
              <Text color="secondary">No party selected.</Text>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(titles.backHref)}
              >
                ← {titles.back}
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    );
  }

  const partyName = data?.partyDisplayName?.trim() || `${titles.kind} statement`;
  const opening = data?.openingBalance ?? 0;
  const closing = data?.closingBalance ?? 0;
  const txnCount = data?.totalItems ?? 0;

  return (
    <Stack gap="md">
      <AccountingTabs />

      <PageHeader
        description={`${titles.kind} statement · ${
          partyType === 'VENDOR' ? 'Sundry Creditors' : 'Sundry Debtors'
        }`}
      />

      <Stack gap="sm" align="start">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(titles.backHref)}>
          ← {titles.back}
        </Button>
        <Text as="h2" className={accountingChrome.ledgerAccountTitle}>
          {partyName}
        </Text>
      </Stack>

      <Box className={accountingChrome.partiesFilterBar}>
        <Box className={accountingChrome.partiesFilterDates}>
          <Box className={accountingChrome.partiesFilterField}>
            <Text as="span" className={accountingChrome.partiesFilterLabel}>
              From
            </Text>
            <Input
              aria-label="From date"
              type="date"
              value={from}
              onChange={(e) => {
                setPage(0);
                setFrom(e.target.value);
              }}
            />
          </Box>
          <Box className={accountingChrome.partiesFilterField}>
            <Text as="span" className={accountingChrome.partiesFilterLabel}>
              To
            </Text>
            <Input
              aria-label="To date"
              type="date"
              value={to}
              onChange={(e) => {
                setPage(0);
                setTo(e.target.value);
              }}
            />
          </Box>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFrom('');
              setTo('');
              setPage(0);
            }}
            disabled={!from && !to}
          >
            Clear
          </Button>
        </Box>
      </Box>

      <Box className={accountingChrome.partiesKpiGrid}>
        <Box className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Opening
          </Text>
          <Text
            as="span"
            className={cn(
              accountingChrome.overviewKpiValue,
              opening < 0 && accountingChrome.overviewKpiValueWarning,
            )}
          >
            ₹{formatMoney(opening)}
          </Text>
          <Text variant="caption" color="secondary">
            Before {from ? formatDateShort(from) : 'first entry'}
          </Text>
        </Box>
        <Box className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Closing
          </Text>
          <Text
            as="span"
            className={cn(
              accountingChrome.overviewKpiValue,
              closing < 0 && accountingChrome.overviewKpiValueWarning,
            )}
          >
            ₹{formatMoney(closing)}
          </Text>
          <Text variant="caption" color="secondary">
            {txnCount} txn{txnCount === 1 ? '' : 's'} in range
          </Text>
        </Box>
      </Box>

      <Card>
        <CardBody>
          <Table className={accountingChrome.partiesTable}>
            <TableHead>
              <TableRow>
                <TableHeaderCell className={accountingChrome.ledgerDateCol}>Date</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.ledgerEntryCol}>Entry</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.ledgerSourceCol}>
                  Source
                </TableHeaderCell>
                <TableHeaderCell>Narration</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesNumCol}>Debit</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesNumCol}>Credit</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesOwedCol}>
                  Balance
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={7} label="Loading statement…" />
              ) : (data?.entries.length ?? 0) === 0 ? (
                <TableEmptyRow colSpan={7} message="No postings in this range." />
              ) : (
                (data?.entries ?? []).map((e) => {
                  const debitLabel = formatTurnover(e.debit);
                  const creditLabel = formatTurnover(e.credit);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className={accountingChrome.ledgerDateCol}>
                        {formatDateShort(e.txnDate)}
                      </TableCell>
                      <TableCell className={accountingChrome.ledgerEntryCol}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={accountingChrome.entryLink}
                          onClick={() =>
                            navigate(`/dashboard/accounting/journal/${e.journalEntryId}`)
                          }
                        >
                          {e.journalEntryNo}
                        </Button>
                      </TableCell>
                      <TableCell className={accountingChrome.ledgerSourceCol}>
                        <Badge variant="info">{formatJournalSource(e.sourceType)}</Badge>
                      </TableCell>
                      <TableCell
                        className={accountingChrome.ledgerNarrationCol}
                        title={e.narration ?? undefined}
                      >
                        {e.narration?.trim() ? e.narration : '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          accountingChrome.partiesNumCol,
                          debitLabel === '—' && accountingChrome.ledgerAmountMuted,
                        )}
                      >
                        {debitLabel}
                      </TableCell>
                      <TableCell
                        className={cn(
                          accountingChrome.partiesNumCol,
                          creditLabel === '—' && accountingChrome.ledgerAmountMuted,
                        )}
                      >
                        {creditLabel}
                      </TableCell>
                      <TableCell className={accountingChrome.partiesOwedCol}>
                        {formatMoney(e.balanceAfter)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {(data?.entries.length ?? 0) > 0 || loading ? (
            <PaginationBar
              page={data?.page ?? page}
              totalPages={Math.max(data?.totalPages ?? 1, 1)}
              totalItems={data?.totalItems ?? 0}
              disabled={loading}
              onPageChange={setPage}
              aria-label="Party statement pages"
            />
          ) : null}
        </CardBody>
      </Card>
    </Stack>
  );
}

export function VendorStatementPage() {
  return <PartyStatementPage partyType="VENDOR" />;
}

export function CustomerStatementPage() {
  return <PartyStatementPage partyType="CUSTOMER" />;
}
