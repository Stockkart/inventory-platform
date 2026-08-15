import {
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
import type { MisSalesReportResponse } from '@inventory-platform/mis/types';
import { formatDateShort, formatMoney } from '../model/format';
import { MIS_PAGE_SIZE_OPTIONS, misTotalPages } from '../model/paging';

function rupee(value: number | undefined | null): string {
  return `₹${formatMoney(value)}`;
}

export interface SalesMisPanelProps {
  data: MisSalesReportResponse | null;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function SalesMisPanel({
  data,
  loading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: SalesMisPanelProps) {
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
              <TableLoadingRow colSpan={9} label="Loading daily sales…" />
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
            Net sales
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {rupee(summary?.netSales)}
          </Text>
        </Box>
        <Box
          className={cn(accountingChrome.overviewKpiCard, accountingChrome.overviewKpiCardCenter)}
        >
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Gross
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {rupee(summary?.gross)}
          </Text>
        </Box>
        <Box
          className={cn(accountingChrome.overviewKpiCard, accountingChrome.overviewKpiCardCenter)}
        >
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Profit
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {rupee(summary?.profit)}
          </Text>
        </Box>
        <Box
          className={cn(accountingChrome.overviewKpiCard, accountingChrome.overviewKpiCardCenter)}
        >
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Orders
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {summary?.count ?? 0}
          </Text>
        </Box>
      </Box>

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text as="h2" className={accountingChrome.overviewSectionTitle}>
              Daily sales
            </Text>
            {rows.length === 0 ? (
              <Text as="p" className={accountingChrome.reportEmpty}>
                No sales in this period.
              </Text>
            ) : (
              <Table className={accountingChrome.misTable}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell className={accountingChrome.misDateCol}>Date</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Orders</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Gross</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Tax</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Cash</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Online</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Credit</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>Profit</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.misNumCol}>
                      Net sales
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className={accountingChrome.misDateCol}>
                        {formatDateShort(row.date)}
                      </TableCell>
                      <TableCell className={accountingChrome.misNumCol}>{row.orderCount}</TableCell>
                      <TableCell className={accountingChrome.misNumCol}>
                        {rupee(row.grandTotal)}
                      </TableCell>
                      <TableCell className={accountingChrome.misNumCol}>{rupee(row.tax)}</TableCell>
                      <TableCell className={accountingChrome.misNumCol}>
                        {rupee(row.cash)}
                      </TableCell>
                      <TableCell className={accountingChrome.misNumCol}>
                        {rupee(row.online)}
                      </TableCell>
                      <TableCell className={accountingChrome.misNumCol}>
                        {rupee(row.credit)}
                      </TableCell>
                      <TableCell className={accountingChrome.misNumCol}>
                        {rupee(row.profit)}
                      </TableCell>
                      <TableCell className={accountingChrome.misNumCol}>
                        {rupee(row.netSales)}
                      </TableCell>
                    </TableRow>
                  ))}
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
              aria-label="Sales pages"
            />
          </Stack>
        </CardBody>
      </Card>

      <Text variant="caption" color="secondary">
        Period {formatDateShort(data.from)} – {formatDateShort(data.to)} · {totalItems} day
        {totalItems === 1 ? '' : 's'}
        {summary && summary.refundCount > 0
          ? ` · ${summary.refundCount} refund${summary.refundCount === 1 ? '' : 's'} (${rupee(
              summary.refundAmount,
            )})`
          : ''}
      </Text>
    </Stack>
  );
}
