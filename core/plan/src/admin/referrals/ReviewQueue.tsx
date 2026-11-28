import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  FormField,
  Inline,
  Input,
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
import type {
  AdminReferralAttribution,
  ReferralAttributionStatus,
} from '@inventory-platform/plan/types';
import {
  useAdminAttributionsQuery,
  useApproveAttributionMutation,
  useRejectAttributionMutation,
} from '../hooks';
import { ReasonDialog } from '../ReasonDialog';
import {
  adminErrorMessage,
  attributionStatusBadge,
  formatAdminDate,
  reviewReasonLabel,
} from '../format';

const STATUS_OPTIONS: ReadonlyArray<{ value: ReferralAttributionStatus; label: string }> = [
  { value: 'PENDING_REVIEW', label: 'Needs review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SELF_REFERRAL', label: 'Self-referral' },
  { value: 'DUPLICATE', label: 'Duplicate' },
];

type Pending = { kind: 'approve' | 'reject'; attribution: AdminReferralAttribution } | null;

export function ReviewQueue() {
  const [status, setStatus] = useState<ReferralAttributionStatus>('PENDING_REVIEW');
  const [pending, setPending] = useState<Pending>(null);
  const [referrerShopId, setReferrerShopId] = useState('');
  const query = useAdminAttributionsQuery(status);
  const approve = useApproveAttributionMutation();
  const reject = useRejectAttributionMutation();
  const busy = approve.isPending || reject.isPending;
  const actionError = approve.error ?? reject.error;

  const open = (kind: 'approve' | 'reject', attribution: AdminReferralAttribution) => {
    approve.reset();
    reject.reset();
    setReferrerShopId(attribution.referrerShopId ?? '');
    setPending({ kind, attribution });
  };

  const confirm = (reason: string) => {
    if (!pending) return;
    const { id } = pending.attribution;
    const onSuccess = () => {
      useNotify.success(pending.kind === 'approve' ? 'Referral approved' : 'Referral rejected');
      setPending(null);
    };
    if (pending.kind === 'approve') {
      approve.mutate(
        { id, body: { referrerShopId: referrerShopId.trim() || undefined, reason } },
        { onSuccess },
      );
    } else {
      reject.mutate({ id, reason }, { onSuccess });
    }
  };

  const rows = query.data ?? [];
  const needsReferrer = pending?.kind === 'approve' && !pending.attribution.referrerShopId;

  return (
    <Stack gap="md">
      <Inline gap="md" align="end">
        <FormField label="Status" htmlFor="referral-queue-status">
          <Select
            id="referral-queue-status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => setStatus(e.target.value as ReferralAttributionStatus)}
          />
        </FormField>
        <Text variant="caption" color="secondary">
          Oldest first. Approving a referral records a reward if the referred shop has already paid.
        </Text>
      </Inline>

      {query.isError ? (
        <Alert variant="danger">
          {adminErrorMessage(query.error, 'Could not load referrals.')}
        </Alert>
      ) : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Referred shop</TableHeaderCell>
            <TableHeaderCell>What they entered</TableHeaderCell>
            <TableHeaderCell>Referring shop</TableHeaderCell>
            <TableHeaderCell>Why it needs review</TableHeaderCell>
            <TableHeaderCell>Signed up</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {query.isLoading ? (
            <TableLoadingRow colSpan={7} />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={7} message="Nothing here." />
          ) : (
            rows.map((a) => {
              const badge = attributionStatusBadge(a.status);
              return (
                <TableRow key={a.id}>
                  <TableCell>{a.refereeShopName ?? a.refereeShopId}</TableCell>
                  <TableCell>
                    {[a.referrerCodeUsed, a.rawReferredByName].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell>{a.referrerShopName ?? a.referrerShopId ?? '—'}</TableCell>
                  <TableCell>
                    {a.status === 'REJECTED' && a.rejectionReason
                      ? a.rejectionReason
                      : reviewReasonLabel(a.reviewReason)}
                  </TableCell>
                  <TableCell>{formatAdminDate(a.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {a.status === 'PENDING_REVIEW' ? (
                      <Inline gap="sm">
                        <Button size="sm" variant="solid" onClick={() => open('approve', a)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => open('reject', a)}>
                          Reject
                        </Button>
                      </Inline>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <ReasonDialog
        open={pending !== null}
        title={pending?.kind === 'approve' ? 'Approve referral' : 'Reject referral'}
        message={
          pending?.kind === 'approve'
            ? `${
                pending.attribution.refereeShopName ?? 'This shop'
              } will count as referred. If it has already bought a plan, the referrer's reward is recorded now.`
            : 'The referring shop will not earn a reward for this sign-up.'
        }
        confirmLabel={pending?.kind === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={pending?.kind === 'approve' ? 'solid' : 'danger'}
        confirmDisabled={needsReferrer && referrerShopId.trim().length === 0}
        busy={busy}
        error={actionError ? adminErrorMessage(actionError) : null}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      >
        {pending?.kind === 'approve' ? (
          <FormField
            label="Referring shop ID"
            htmlFor="referral-referrer-shop"
            required={needsReferrer}
            hint={
              needsReferrer
                ? `They wrote "${
                    pending.attribution.rawReferredByName ??
                    pending.attribution.referrerCodeUsed ??
                    ''
                  }". Find that shop and paste its ID.`
                : 'Change only if the code pointed at the wrong shop.'
            }
          >
            <Input
              id="referral-referrer-shop"
              value={referrerShopId}
              onChange={(e) => setReferrerShopId(e.target.value)}
              disabled={busy}
            />
          </FormField>
        ) : null}
      </ReasonDialog>
    </Stack>
  );
}
