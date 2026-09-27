import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Inline,
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
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { useReferralRewardsQuery, useReferralSummaryQuery, useWalletQuery } from '../queries/hooks';
import {
  referralShareLink,
  referredByMessage,
  rewardStatusBadge,
  walletSourceLabel,
} from '../referrals';
import { formatRupees } from '../ui/planPricing';

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="title" weight="bold">
        {value}
      </Text>
    </Stack>
  );
}

export function ReferralsPage() {
  const summaryQuery = useReferralSummaryQuery();
  const rewardsQuery = useReferralRewardsQuery();
  const walletQuery = useWalletQuery();

  if (summaryQuery.isLoading) {
    return <CenteredLoader label="Loading…" />;
  }

  const summary = summaryQuery.data;
  const rewards = rewardsQuery.data;
  const wallet = walletQuery.data;
  const shareLink =
    summary?.referralCode && typeof window !== 'undefined'
      ? referralShareLink(window.location.origin, summary.referralCode)
      : null;
  const referredBy = referredByMessage(summary?.referredByStatus ?? null);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      useNotify.success(`${what} copied`);
    } catch {
      useNotify.error(`Could not copy the ${what.toLowerCase()}`);
    }
  };

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="Share your code. When a shop you refer buys a plan, you earn wallet credit towards your own." />

      {summaryQuery.isError ? (
        <Alert variant="danger">Could not load your referral details.</Alert>
      ) : null}
      {referredBy ? <Alert variant="info">{referredBy}</Alert> : null}

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text variant="heading3" weight="semibold">
              Your referral code
            </Text>
            {summary?.referralCode ? (
              <Inline gap="md" align="center">
                <Text variant="title" weight="bold">
                  {summary.referralCode}
                </Text>
                <Button
                  variant="solid"
                  onClick={() => void copy(summary.referralCode ?? '', 'Code')}
                >
                  Copy code
                </Button>
                {shareLink ? (
                  <Button variant="outline" onClick={() => void copy(shareLink, 'Link')}>
                    Copy sign-up link
                  </Button>
                ) : null}
              </Inline>
            ) : (
              <Text color="secondary">Your code is being generated. Check back shortly.</Text>
            )}
            <Inline gap="lg">
              <Figure label="Shops referred" value={String(summary?.resolvedReferrals ?? 0)} />
              <Figure label="In review" value={String(summary?.pendingReviewReferrals ?? 0)} />
              <Figure label="Rewards on hold" value={formatRupees(rewards?.pendingAmount ?? 0)} />
              <Figure label="Rewards credited" value={formatRupees(rewards?.creditedAmount ?? 0)} />
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text variant="heading3" weight="semibold">
              Rewards
            </Text>
            <Text variant="caption" color="secondary">
              A reward is held for a short period after the referred shop pays, then added to your
              wallet. It is cancelled if that purchase is refunded.
            </Text>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Shop</TableHeaderCell>
                  <TableHeaderCell>Plan</TableHeaderCell>
                  <TableHeaderCell>Reward</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Available from</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(rewards?.rewards ?? []).length === 0 ? (
                  <TableEmptyRow colSpan={5} message="No rewards yet." />
                ) : (
                  rewards?.rewards.map((reward) => {
                    const badge = rewardStatusBadge(reward.status);
                    return (
                      <TableRow key={reward.id}>
                        <TableCell>{reward.refereeShopName || '—'}</TableCell>
                        <TableCell>{reward.planCode ?? '—'}</TableCell>
                        <TableCell>{formatRupees(reward.rewardAmount)}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(
                            reward.status === 'CREDITED' ? reward.creditedAt : reward.holdUntil,
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text variant="heading3" weight="semibold">
              Wallet
            </Text>
            <Inline gap="lg">
              <Figure label="Available" value={formatRupees(wallet?.availableBalance ?? 0)} />
              <Figure
                label="Held for checkout"
                value={formatRupees(wallet?.reservedBalance ?? 0)}
              />
              {wallet && wallet.outstandingClawback > 0 ? (
                <Figure label="Owed back" value={formatRupees(wallet.outstandingClawback)} />
              ) : null}
            </Inline>
            <Text variant="caption" color="secondary">
              Use your wallet on the Payment page when you renew or upgrade your plan.
            </Text>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Activity</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Balance</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(wallet?.entries ?? []).length === 0 ? (
                  <TableEmptyRow colSpan={4} message="No wallet activity yet." />
                ) : (
                  wallet?.entries.map((entry) => (
                    <TableRow key={`${entry.source}-${entry.sourceId}-${entry.createdAt}`}>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>{walletSourceLabel(entry.source)}</TableCell>
                      <TableCell>
                        {entry.availableDelta >= 0 ? '+' : '−'}
                        {formatRupees(Math.abs(entry.availableDelta))}
                      </TableCell>
                      <TableCell>{formatRupees(entry.availableAfter)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
