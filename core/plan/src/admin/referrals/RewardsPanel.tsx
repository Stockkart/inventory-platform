import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  FormField,
  Inline,
  Select,
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
import { useNotify } from '@inventory-platform/session';
import type { AdminReferralReward, ReferralRewardStatus } from '@inventory-platform/plan/types';
import { useAdminRewardsQuery, useRewardActionMutation } from '../hooks';
import { ReasonDialog } from '../ReasonDialog';
import { adminErrorMessage, formatAdminDate } from '../format';
import { rewardStatusBadge } from '../../referrals';
import { formatRupees } from '../../ui/planPricing';

type RewardAction = 'approve' | 'void' | 'clawback';

const STATUS_OPTIONS: ReadonlyArray<{ value: ReferralRewardStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'On hold' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CREDITING', label: 'Crediting' },
  { value: 'CREDITED', label: 'Credited' },
  { value: 'VOID', label: 'Not eligible' },
  { value: 'CLAWED_BACK', label: 'Reversed' },
];

const ACTION_COPY: Record<
  RewardAction,
  { title: string; confirm: string; message: string; notice: string; danger: boolean }
> = {
  approve: {
    title: 'Approve reward',
    confirm: 'Approve',
    message: 'Skips the rest of the hold. The reward reaches the wallet on the next hourly run.',
    notice: 'Reward approved',
    danger: false,
  },
  void: {
    title: 'Void reward',
    confirm: 'Void',
    message: 'The referrer will not receive this reward. This cannot be undone.',
    notice: 'Reward voided',
    danger: true,
  },
  clawback: {
    title: 'Claw back reward',
    confirm: 'Claw back',
    message:
      "Takes the amount back from the referrer's wallet. Whatever they have already spent is recorded as owed and settled from future credit.",
    notice: 'Reward clawed back',
    danger: true,
  },
};

/** Which actions a reward's state allows; the server enforces the same rules. */
export function rewardActions(status: ReferralRewardStatus): RewardAction[] {
  switch (status) {
    case 'PENDING':
      return ['approve', 'void'];
    case 'APPROVED':
      return ['void'];
    case 'CREDITED':
      return ['clawback'];
    default:
      return [];
  }
}

const ACTION_LABEL: Record<RewardAction, string> = {
  approve: 'Approve',
  void: 'Void',
  clawback: 'Claw back',
};

export function RewardsPanel() {
  const [status, setStatus] = useState<ReferralRewardStatus | 'ALL'>('PENDING');
  const [pending, setPending] = useState<{
    action: RewardAction;
    reward: AdminReferralReward;
  } | null>(null);
  const query = useAdminRewardsQuery(status === 'ALL' ? null : status);
  const mutation = useRewardActionMutation();
  const rows = query.data ?? [];
  const copy = pending ? ACTION_COPY[pending.action] : null;

  const open = (action: RewardAction, reward: AdminReferralReward) => {
    mutation.reset();
    setPending({ action, reward });
  };

  const confirm = (reason: string) => {
    if (!pending || !copy) return;
    mutation.mutate(
      { id: pending.reward.id, action: pending.action, reason },
      {
        onSuccess: () => {
          useNotify.success(copy.notice);
          setPending(null);
        },
      },
    );
  };

  return (
    <Stack gap="md">
      <Inline gap="md" align="end">
        <FormField label="Status" htmlFor="referral-reward-status">
          <Select
            id="referral-reward-status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => setStatus(e.target.value as ReferralRewardStatus | 'ALL')}
          />
        </FormField>
        <Text variant="caption" color="secondary">
          Newest first, up to 200.
        </Text>
      </Inline>

      {query.isError ? (
        <Alert variant="danger">{adminErrorMessage(query.error, 'Could not load rewards.')}</Alert>
      ) : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Referrer</TableHeaderCell>
            <TableHeaderCell>Referred shop</TableHeaderCell>
            <TableHeaderCell>Plan</TableHeaderCell>
            <TableHeaderCell>Reward</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Hold ends</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {query.isLoading ? (
            <TableLoadingRow colSpan={7} />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={7} message="No rewards." />
          ) : (
            rows.map((r) => {
              const badge = rewardStatusBadge(r.status);
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.referrerShopName ?? r.referrerShopId}</TableCell>
                  <TableCell>{r.refereeShopName ?? r.refereeShopId}</TableCell>
                  <TableCell>{r.planCode ?? '—'}</TableCell>
                  <TableCell>
                    {formatRupees(r.rewardAmount)}
                    <Text as="span" variant="caption" color="secondary">
                      {' '}
                      ({r.rewardPercent}% of {formatRupees(r.basePlanAmount)})
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {r.voidReason ? (
                      <Text variant="caption" color="secondary">
                        {r.voidReason}
                      </Text>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatAdminDate(r.holdUntil)}</TableCell>
                  <TableCell>
                    <Inline gap="sm">
                      {rewardActions(r.status).map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === 'approve' ? 'solid' : 'outline'}
                          onClick={() => open(action, r)}
                        >
                          {ACTION_LABEL[action]}
                        </Button>
                      ))}
                    </Inline>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <ReasonDialog
        open={pending !== null}
        title={copy?.title ?? ''}
        message={
          pending && copy
            ? `${formatRupees(pending.reward.rewardAmount)} to ${
                pending.reward.referrerShopName ?? pending.reward.referrerShopId
              }. ${copy.message}`
            : undefined
        }
        confirmLabel={copy?.confirm ?? 'Confirm'}
        confirmVariant={copy?.danger ? 'danger' : 'solid'}
        busy={mutation.isPending}
        error={mutation.error ? adminErrorMessage(mutation.error) : null}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </Stack>
  );
}
