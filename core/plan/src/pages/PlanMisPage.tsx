import { useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Inline,
  Input,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import type { PlanMisParams } from '@inventory-platform/plan/types';
import { usePlanMisQuery } from '../queries/hooks';
import {
  MIS_PRESETS,
  formatCount,
  formatPercent,
  misPresetRange,
  misRangeError,
  type MisPreset,
} from '../admin/mis';
import { formatRupees } from '../ui/planPricing';

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Stack gap="xs">
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="title" weight="bold">
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color="secondary">
          {hint}
        </Text>
      ) : null}
    </Stack>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Text variant="heading3" weight="semibold">
            {title}
          </Text>
          {note ? (
            <Text variant="caption" color="secondary">
              {note}
            </Text>
          ) : null}
          {children}
        </Stack>
      </CardBody>
    </Card>
  );
}

export function PlanMisPage() {
  const initial = misPresetRange('last30');
  const [preset, setPreset] = useState<MisPreset | 'custom'>('last30');
  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [applied, setApplied] = useState<PlanMisParams>(initial);

  const draftError = misRangeError({ from: fromInput, to: toInput });
  const misQuery = usePlanMisQuery(applied);
  const report = misQuery.data;

  const applyPreset = (key: MisPreset) => {
    const range = misPresetRange(key);
    setPreset(key);
    setFromInput(range.from);
    setToInput(range.to);
    setApplied(range);
  };

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Revenue MIS"
        description="Plan, add-on, voucher, referral and wallet figures across all shops."
        actions={
          <Inline gap="sm" flexWrap>
            {MIS_PRESETS.map(({ key, label }) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={preset === key ? 'solid' : 'outline'}
                onClick={() => applyPreset(key)}
              >
                {label}
              </Button>
            ))}
          </Inline>
        }
      />

      <Card>
        <CardBody>
          <Stack gap="sm">
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
                />
              </Box>
              <Button
                type="button"
                variant="solid"
                disabled={Boolean(draftError) || misQuery.isFetching}
                onClick={() => setApplied({ from: fromInput, to: toInput })}
              >
                Apply
              </Button>
            </Box>
            <Text variant="caption" color={draftError ? 'danger' : 'secondary'}>
              {draftError ?? 'Both days are included. Dates are in Indian Standard Time.'}
            </Text>
          </Stack>
        </CardBody>
      </Card>

      {misQuery.isError ? (
        <Alert variant="danger">Could not load the report. Try again, or narrow the range.</Alert>
      ) : null}

      {misQuery.isLoading ? <CenteredLoader label="Loading report…" /> : null}

      {report ? (
        <>
          <Section
            title="Revenue"
            note="Orders paid in the range, including any refunded later. Refunds count on the day they were made."
          >
            <Inline gap="lg" flexWrap>
              <Figure label="Paid orders" value={formatCount(report.revenue.paidOrders)} />
              <Figure label="Gross revenue" value={formatRupees(report.revenue.grossRevenue)} />
              <Figure
                label="Refunds"
                value={formatRupees(report.revenue.refundedAmount)}
                hint={`${formatCount(report.revenue.refundedOrders)} orders`}
              />
              <Figure label="Net revenue" value={formatRupees(report.revenue.netRevenue)} />
              <Figure label="Discounts given" value={formatRupees(report.revenue.discounts)} />
              <Figure
                label="Paid from wallets"
                value={formatRupees(report.revenue.walletCreditApplied)}
              />
            </Inline>
          </Section>

          <Section title="Plan sales by tier">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Plan</TableHeaderCell>
                  <TableHeaderCell>Orders</TableHeaderCell>
                  <TableHeaderCell>Revenue</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.planSales.length === 0 ? (
                  <TableEmptyRow colSpan={3} message="No plans sold in this range." />
                ) : (
                  report.planSales.map((row) => (
                    <TableRow key={row.planCode ?? 'unknown'}>
                      <TableCell>{row.planName ?? row.planCode ?? '—'}</TableCell>
                      <TableCell>{formatCount(row.orders)}</TableCell>
                      <TableCell>{formatRupees(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Section>

          <Section
            title="Add-ons"
            note="Attach rate is the share of plan orders that also bought an add-on or OCR top-up."
          >
            <Inline gap="lg" flexWrap>
              <Figure
                label="Attach rate"
                value={formatPercent(report.addOns.attachRatePercent)}
                hint={`${formatCount(report.addOns.planOrdersWithAddOn)} of ${formatCount(
                  report.addOns.planOrders,
                )} plan orders`}
              />
              <Figure
                label="OCR top-ups"
                value={`${formatCount(report.ocrTopUps.credits)} credits`}
                hint={`${formatCount(report.ocrTopUps.units)} packs · ${formatRupees(
                  report.ocrTopUps.revenue,
                )}`}
              />
            </Inline>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Add-on</TableHeaderCell>
                  <TableHeaderCell>Orders</TableHeaderCell>
                  <TableHeaderCell>Units</TableHeaderCell>
                  <TableHeaderCell>Revenue</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.addOns.items.length === 0 ? (
                  <TableEmptyRow colSpan={4} message="No add-ons sold in this range." />
                ) : (
                  report.addOns.items.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell>{row.name ?? row.code}</TableCell>
                      <TableCell>{formatCount(row.orders)}</TableCell>
                      <TableCell>{formatCount(row.units)}</TableCell>
                      <TableCell>{formatRupees(row.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Section>

          <Section title="Vouchers" note="Discounts on orders that were paid and fulfilled.">
            <Inline gap="lg" flexWrap>
              <Figure label="Redemptions" value={formatCount(report.vouchers.redemptions)} />
              <Figure label="Discount value" value={formatRupees(report.vouchers.discountValue)} />
            </Inline>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Redemptions</TableHeaderCell>
                  <TableHeaderCell>Discount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.vouchers.topCodes.length === 0 ? (
                  <TableEmptyRow colSpan={3} message="No vouchers redeemed in this range." />
                ) : (
                  report.vouchers.topCodes.map((row) => (
                    <TableRow key={row.voucherCode}>
                      <TableCell>{row.voucherCode}</TableCell>
                      <TableCell>{formatCount(row.redemptions)}</TableCell>
                      <TableCell>{formatRupees(row.discountValue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Section>

          <Section
            title="Referrals"
            note="Reward cost counts rewards earned in the range that were not voided or clawed back. New revenue is each new shop's first paid order."
          >
            <Inline gap="lg" flexWrap>
              <Figure
                label="Reward cost"
                value={formatRupees(report.referrals.rewardCost)}
                hint={`${formatCount(report.referrals.rewardsEarned)} rewards · ${formatCount(
                  report.referrals.rewardsVoided,
                )} voided`}
              />
              <Figure
                label="New revenue"
                value={formatRupees(report.referrals.newRevenue)}
                hint={`${formatCount(report.referrals.newShops)} new shops`}
              />
              <Figure
                label="Cost of new revenue"
                value={formatPercent(report.referrals.costPercentOfNewRevenue)}
              />
              <Figure label="Credited" value={formatRupees(report.referrals.creditedAmount)} />
              <Figure label="Clawed back" value={formatRupees(report.referrals.clawedBackAmount)} />
            </Inline>
          </Section>

          <Section
            title="Wallet"
            note="Movements in the range. Liability and unrecovered clawback are today's totals across all wallets."
          >
            <Inline gap="lg" flexWrap>
              <Figure
                label="Rewards credited"
                value={formatRupees(report.wallet.rewardsCredited)}
              />
              <Figure label="Spent on plans" value={formatRupees(report.wallet.spentOnOrders)} />
              <Figure
                label="Refunded to wallets"
                value={formatRupees(report.wallet.refundedToWallet)}
              />
              <Figure label="Clawed back" value={formatRupees(report.wallet.clawedBack)} />
              <Figure
                label="Manual adjustments"
                value={formatRupees(report.wallet.manualAdjustmentsNet)}
              />
              <Figure
                label="Liability now"
                value={formatRupees(report.wallet.outstandingLiability)}
              />
              <Figure
                label="Unrecovered clawback"
                value={formatRupees(report.wallet.unrecoveredClawback)}
              />
            </Inline>
          </Section>
        </>
      ) : null}
    </Stack>
  );
}
