import {
  Badge,
  Box,
  Card,
  CardBody,
  PaginationBar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  cn,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import type { MisMoneyReportResponse } from '@inventory-platform/mis/types';
import { formatDateShort, formatMoney } from '../model/format';
import { MIS_PAGE_SIZE_OPTIONS, misTotalPages } from '../model/paging';
import { shortenTxnId } from '../model/txnId';

function rupee(value: number | undefined | null): string {
  return `₹${formatMoney(value)}`;
}

export interface CustomerMoneyMisPanelProps {
  data: MisMoneyReportResponse | null;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function CustomerMoneyMisPanel({
  data,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: CustomerMoneyMisPanelProps) {
  const summary = data?.summary;
  const rows = data?.rows ?? [];
  const totalItems = data?.totalItems ?? 0;
  const totalPages = misTotalPages(totalItems, pageSize);

  if (loading && !data) {
    return (
      <Card>
        <CardBody>
          <Table>
            <TableBody>
              <TableLoadingRow colSpan={10} label="Loading customer transactions…" />
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardBody>
          <Text color="secondary">No data for this period.</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Box className={accountingChrome.kpiGrid4}>
        <Box
          className={cn(accountingChrome.overviewKpiCard, accountingChrome.overviewKpiCardCenter)}
        >
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Period cash
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {rupee(summary?.periodCashTotal)}
          </Text>
        </Box>
        <Box
          className={cn(accountingChrome.overviewKpiCard, accountingChrome.overviewKpiCardCenter)}
        >
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Period online
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {rupee(summary?.periodOnlineTotal)}
          </Text>
        </Box>
        <Box
          className={cn(accountingChrome.overviewKpiCard, accountingChrome.overviewKpiCardCenter)}
        >
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Period credit
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {rupee(summary?.periodCreditTotal)}
          </Text>
        </Box>
        <Box
          className={cn(accountingChrome.overviewKpiCard, accountingChrome.overviewKpiCardCenter)}
        >
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Current receivable
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {rupee(summary?.currentBalanceTotal)}
          </Text>
        </Box>
      </Box>

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text as="h2" className={accountingChrome.overviewSectionTitle}>
              Transactions
            </Text>
            {rows.length === 0 ? (
              <Text as="p" className={accountingChrome.reportEmpty}>
                No transactions in this period.
              </Text>
            ) : (
              <Table className={accountingChrome.misTable}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell className={accountingChrome.misDateCol}>Date</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Txn ID</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misTxnTypeCol}>
                      Transaction
                    </TableHeaderCell>
                    <TableHeaderCell>Invoice</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>
                      Bill Amount
                    </TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Cash</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Online</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Credit</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>
                      Outstanding
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const typeLabel = row.opening ? 'Opening' : row.txnTypeLabel || row.txnType;
                    const fullTxnId = row.txnId || row.sourceId || '';
                    return (
                      <TableRow key={`${row.txnType}-${fullTxnId}-${row.txnDate}`}>
                        <TableCell className={accountingChrome.misDateCol}>
                          {formatDateShort(row.txnDate)}
                        </TableCell>
                        <TableCell className={accountingChrome.misPartyCol}>
                          {row.partyName || '—'}
                        </TableCell>
                        <TableCell
                          className={accountingChrome.misTxnIdCol}
                          title={fullTxnId || undefined}
                        >
                          <Text as="span" className={accountingChrome.misTxnId}>
                            {shortenTxnId(fullTxnId)}
                          </Text>
                        </TableCell>
                        <TableCell className={accountingChrome.misTxnTypeCol}>
                          <Badge variant="neutral">{typeLabel}</Badge>
                        </TableCell>
                        <TableCell className={accountingChrome.misInvoiceCol}>
                          {row.refNo || '—'}
                        </TableCell>
                        <TableCell className={accountingChrome.misNumCol}>
                          {rupee(row.totalAmount)}
                        </TableCell>
                        <TableCell className={accountingChrome.misNumCol}>
                          {rupee(row.cashAmount)}
                        </TableCell>
                        <TableCell className={accountingChrome.misNumCol}>
                          {rupee(row.onlineAmount)}
                        </TableCell>
                        <TableCell className={accountingChrome.misNumCol}>
                          {rupee(row.creditAmount)}
                        </TableCell>
                        <TableCell className={accountingChrome.misNumCol}>
                          {rupee(row.balanceAfter)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              disabled={loading}
              onPageChange={onPageChange}
              pageSize={pageSize}
              pageSizeOptions={MIS_PAGE_SIZE_OPTIONS}
              onPageSizeChange={onPageSizeChange}
              aria-label="Customer money pages"
            />
          </Stack>
        </CardBody>
      </Card>

      <Text variant="caption" color="secondary">
        Period {formatDateShort(data.from)} – {formatDateShort(data.to)} · {totalItems} row
        {totalItems === 1 ? '' : 's'}
      </Text>
    </Stack>
  );
}
