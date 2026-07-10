import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
  Input,
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
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { PartyStatementResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import type { SubsidiaryPartyType } from './PartiesPage';
import { formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';

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
    reload();
  }, [reload]);

  if (!partyRefId) {
    return (
      <Stack gap="md" className={styles.page}>
        <Card>
          <CardBody>
            <Inline gap="xs" align="center">
              <Text color="secondary">No party selected.</Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(titles.backHref)}
              >
                Go back to {titles.back.toLowerCase()}
              </Button>
            </Inline>
          </CardBody>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={styles.page}>
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader
          title={data?.partyDisplayName || `${titles.kind} ${partyRefId}`}
          description={`${titles.kind} statement · subsidiary view of ${
            partyType === 'VENDOR' ? 'Sundry Creditors' : 'Sundry Debtors'
          } for this party.`}
          actions={
            <Button type="button" variant="ghost" onClick={() => navigate(titles.backHref)}>
              ← {titles.back}
            </Button>
          }
        />
        <Inline gap="sm" className={styles.toolbar}>
          <Text variant="label" color="secondary">
            From
          </Text>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(0);
              setFrom(e.target.value);
            }}
          />
          <Text variant="label" color="secondary">
            To
          </Text>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(0);
              setTo(e.target.value);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFrom('');
              setTo('');
              setPage(0);
            }}
            disabled={!from && !to}
          >
            Clear
          </Button>
        </Inline>
      </Stack>

      <Grid columns={2} gap="md" className={styles.kpiRow}>
        <Card>
          <CardBody>
            <Stack gap="xs">
              <Text variant="caption" color="secondary">
                Opening balance
              </Text>
              <Text variant="heading2" weight="bold">
                {formatMoney(data?.openingBalance ?? 0)}
              </Text>
              <Text variant="caption" color="secondary">
                {partyType === 'VENDOR' ? 'Payable to vendor' : 'Receivable from customer'} before{' '}
                {from || 'first entry'}
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stack gap="xs">
              <Text variant="caption" color="secondary">
                Closing balance
              </Text>
              <Text variant="heading2" weight="bold">
                {formatMoney(data?.closingBalance ?? 0)}
              </Text>
              <Text variant="caption" color="secondary">
                After last shown entry · {data?.totalItems ?? 0} txn
                {(data?.totalItems ?? 0) === 1 ? '' : 's'}
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Entry #</TableHeaderCell>
                <TableHeaderCell>Account</TableHeaderCell>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell>Narration</TableHeaderCell>
                <TableHeaderCell className={styles.right}>Debit</TableHeaderCell>
                <TableHeaderCell className={styles.right}>Credit</TableHeaderCell>
                <TableHeaderCell className={styles.right}>Balance</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={8} label="Loading statement…" />
              ) : (data?.entries.length ?? 0) === 0 ? (
                <TableEmptyRow colSpan={8} message="No postings in this range." />
              ) : (
                (data?.entries ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.txnDate)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/accounting/journal/${e.journalEntryId}`)
                        }
                      >
                        {e.journalEntryNo}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/dashboard/accounting/ledger/${e.accountId}`)}
                      >
                        {e.accountCode} · {e.accountName}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge className={styles.sourcePill}>{e.sourceType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Text color="secondary" variant="caption">
                        {e.narration ?? '—'}
                      </Text>
                    </TableCell>
                    <TableCell className={`${styles.right} ${styles.number}`}>
                      {e.debit ? formatMoney(e.debit) : ''}
                    </TableCell>
                    <TableCell className={`${styles.right} ${styles.number}`}>
                      {e.credit ? formatMoney(e.credit) : ''}
                    </TableCell>
                    <TableCell className={`${styles.right} ${styles.number}`}>
                      {formatMoney(e.balanceAfter)}
                    </TableCell>
                  </TableRow>
                ))
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
