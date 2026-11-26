import { useEffect, useId, useReducer, useRef, type ReactNode } from 'react';
import { Copy, X } from 'lucide-react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Drawer,
  FormField,
  Icon,
  IconButton,
  Inline,
  Stack,
  Text,
  Textarea,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useAuthStore, useNotify } from '@inventory-platform/session';
import {
  REJECT_REASON_MAX,
  normaliseRejectReason,
  type JoinRequestDetail,
  type WorkerJoinStatus,
} from '@inventory-platform/hr/types';
import {
  useApproveJoinRequestMutation,
  useJoinRequestQuery,
  useRejectJoinRequestMutation,
} from '../queries/hooks';
import { JoinRequestPhoto } from './JoinRequestPhoto';
import { PossibleMatchPanel, matchLabel } from './PossibleMatchPanel';
import {
  DRAWER_IDLE,
  drawerReducer,
  exactTimeIst,
  reasonCounter,
  reasonTooLong,
  relativeTime,
} from './joinRequestDrawer';

const STATUS_LABELS: Record<WorkerJoinStatus, string> = {
  PENDING: 'Pending',
  APPROVING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

/** "Approved 6. 2 need your review" and friends live in the tab; this is the one-row status chip. */
export function JoinRequestStatusBadge({ status }: { status: WorkerJoinStatus }) {
  const variant = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'neutral';
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

export interface RequestedTimeProps {
  /** ISO instant of the request. */
  at: string;
  /** Caption by default; `body` on a table cell. */
  variant?: 'caption' | 'body';
}

/**
 * "2 h ago" with the exact IST timestamp on hover and for screen readers (R4.14). A `<time>` so
 * assistive tech knows it is a date; the relative text is recomputed on every render.
 */
export function RequestedTime({ at, variant = 'caption' }: RequestedTimeProps) {
  const exact = exactTimeIst(at);
  return (
    <Text
      as="time"
      variant={variant}
      color={variant === 'caption' ? 'secondary' : 'primary'}
      title={exact}
      aria-label={`Requested ${exact}`}
      {...({ dateTime: at } as Record<string, string>)}
    >
      {relativeTime(at)}
    </Text>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <Box as="section" className={hrChrome.hrJoinDrawerSection} aria-labelledby={headingId}>
      <Text variant="overline" as="h3" id={headingId} color="muted">
        {title}
      </Text>
      {children}
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box className={hrChrome.hrJoinDrawerRow}>
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text align="right">{value || '—'}</Text>
    </Box>
  );
}

/** Phone or email with a copy button: clipboard, then the "Copied" toast (R4.14). */
function ContactRow({ label, value }: { label: 'Phone' | 'Email'; value: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      useNotify.success('Copied');
    } catch {
      useNotify.error(`Could not copy the ${label.toLowerCase()}`);
    }
  };
  return (
    <Box className={hrChrome.hrJoinDrawerRow}>
      <Stack gap="xs" minWidth="0">
        <Text variant="caption" color="muted">
          {label}
        </Text>
        <Text truncate>{value || '—'}</Text>
      </Stack>
      {value ? (
        <IconButton label={`Copy ${label.toLowerCase()}`} size="sm" onClick={copy}>
          <Icon icon={Copy} size="sm" />
        </IconButton>
      ) : null}
    </Box>
  );
}

export interface JoinRequestRowProps {
  /** The request to show; `null` = closed. */
  id: string | null;
  /**
   * `approve` when the drawer was opened by Approve on a row with a possible match: focus lands on
   * **Link to existing** in the match card as soon as the detail is in, so the approver answers
   * the link-or-create question without hunting for it (R4.4, R4.15).
   */
  intent?: 'approve' | null;
  onClose: () => void;
}

/**
 * The join-request drawer (R4.14–R4.17): header with photo, name, status chip and relative time;
 * Contact (copy buttons) and Request sections; the possible-match card with inline **Link to
 * existing** / **Create new**; a sticky footer with **Reject** / **Approve**, where Reject expands
 * an inline reason field instead of a second dialog. A refusal (8038–8040: already handled, linked
 * elsewhere, exited) is shown word for word inside the drawer and the request stays as it was;
 * the hooks refresh the list on every outcome (R4.10).
 */
export function JoinRequestRow({ id, intent = null, onClose }: JoinRequestRowProps) {
  const titleId = useId();
  const reasonId = useId();
  const linkButtonId = useId();
  const detail = useJoinRequestQuery(id ?? undefined);
  const approve = useApproveJoinRequestMutation();
  const reject = useRejectJoinRequestMutation();
  const [state, dispatch] = useReducer(drawerReducer, DRAWER_IDLE);
  const shopName = useAuthStore(
    (s) =>
      s.shop?.name ?? s.user?.shops?.find((m) => m.shopId === s.user?.shopId)?.shopName ?? null,
  );
  // The `approve` intent is honoured once per opened request, not again when the detail refetches.
  const intentDone = useRef(false);

  const request: JoinRequestDetail | undefined = detail.data;
  const match = request?.possibleMatch ?? null;
  const pending = request?.status === 'PENDING';
  const busy = state.kind === 'saving';
  const rejecting =
    state.kind === 'rejecting' || (state.kind === 'saving' && state.mode === 'REJECT');
  const reason = state.kind === 'rejecting' || state.kind === 'saving' ? state.reason : '';

  // A fresh drawer for every request.
  useEffect(() => {
    dispatch({ type: 'open' });
    intentDone.current = false;
  }, [id]);

  // Approve from the table on a matched row: put the approver on the choice straight away.
  useEffect(() => {
    if (intentDone.current || intent !== 'approve') return;
    if (request && request.id === id && pending && match) {
      intentDone.current = true;
      document.getElementById(linkButtonId)?.focus();
    }
  }, [intent, request, id, pending, match, linkButtonId]);

  const closeDrawer = () => {
    if (busy) return;
    dispatch({ type: 'close' });
    onClose();
  };

  const doApprove = (mode: 'CREATE' | 'LINK') => {
    if (!request || state.kind !== 'idle') return;
    dispatch({ type: 'approve', mode });
    approve.mutate(
      {
        id: request.id,
        body: mode === 'LINK' ? { mode, employeeId: match?.employeeId } : { mode },
      },
      {
        onSuccess: (decision) => {
          dispatch({ type: 'ok' });
          useNotify.success(
            decision.outcome === 'APPROVED_LINKED'
              ? `${request.name} linked to ${match ? matchLabel(match) : 'the employee'}`
              : `${request.name} added as an employee`,
          );
          onClose();
        },
        onError: (err) =>
          dispatch({ type: 'error', message: err.message || 'Could not approve the request' }),
      },
    );
  };

  const confirmReject = () => {
    if (!request || state.kind !== 'rejecting' || reasonTooLong(state.reason)) return;
    dispatch({ type: 'confirm' });
    reject.mutate(
      { id: request.id, reason: normaliseRejectReason(state.reason) },
      {
        onSuccess: () => {
          dispatch({ type: 'ok' });
          useNotify.success(`${request.name}'s request rejected`);
          onClose();
        },
        onError: (err) =>
          dispatch({ type: 'error', message: err.message || 'Could not reject the request' }),
      },
    );
  };

  // Where the last refusal is shown: under the card's buttons when the card is the approval,
  // otherwise in the footer (R4.16).
  const idleError = state.kind === 'idle' ? state.error : null;
  const cardError = match ? idleError : null;
  const footerError = state.kind === 'rejecting' ? state.error : match ? null : idleError;
  const savingMode = state.kind === 'saving' ? state.mode : null;

  return (
    <Drawer
      open={id != null}
      onClose={busy ? undefined : closeDrawer}
      side="right"
      size="lg"
      labelledBy={titleId}
    >
      {id != null ? (
        <Box className={hrChrome.hrJoinDrawer}>
          <Box as="header" className={hrChrome.hrJoinDrawerHeader}>
            <JoinRequestPhoto
              name={request?.name ?? ''}
              photoUrl={request?.photoUrl}
              className={hrChrome.hrJoinDrawerAvatar}
            />
            <Box className={hrChrome.hrJoinDrawerTitle}>
              <Text variant="heading4" as="h2" id={titleId} truncate>
                {request ? request.name : 'Join request'}
              </Text>
              {request ? (
                <Inline gap="sm" flexWrap>
                  <JoinRequestStatusBadge status={request.status} />
                  <RequestedTime at={request.requestedAt} />
                </Inline>
              ) : null}
            </Box>
            <IconButton label="Close" onClick={closeDrawer} disabled={busy}>
              <Icon icon={X} size="sm" />
            </IconButton>
          </Box>

          <Box className={hrChrome.hrJoinDrawerBody}>
            {detail.error ? <Alert variant="danger">{detail.error.message}</Alert> : null}
            {detail.isLoading ? <Text color="muted">Loading…</Text> : null}

            {request ? (
              <>
                <Section title="Contact">
                  <ContactRow label="Phone" value={request.phone} />
                  <ContactRow label="Email" value={request.email} />
                </Section>

                <Section title="Request">
                  <Row label="Shop" value={shopName ?? '—'} />
                  <Row label="Requested" value={exactTimeIst(request.requestedAt)} />
                  <Row
                    label="Match"
                    value={match ? `Possible match: ${matchLabel(match)}` : 'No matching employee'}
                  />
                </Section>

                {match ? (
                  <PossibleMatchPanel
                    match={match}
                    onLink={pending ? () => doApprove('LINK') : undefined}
                    onCreate={pending ? () => doApprove('CREATE') : undefined}
                    saving={savingMode === 'LINK' || savingMode === 'CREATE' ? savingMode : null}
                    refusal={cardError}
                    linkButtonId={linkButtonId}
                  />
                ) : null}

                {rejecting ? (
                  <Box className={hrChrome.hrJoinReasonField}>
                    <FormField
                      label="Reason (optional)"
                      htmlFor={reasonId}
                      hint={`${reasonCounter(reason)} · The worker sees this word for word`}
                    >
                      <Textarea
                        id={reasonId}
                        value={reason}
                        onChange={(e) => dispatch({ type: 'reason', value: e.target.value })}
                        rows={3}
                        maxLength={REJECT_REASON_MAX}
                        aria-describedby={`${reasonId}-hint`}
                        disabled={busy}
                        autoFocus
                        placeholder="e.g. Wrong shop, or Ask Ramesh to add you"
                      />
                    </FormField>
                  </Box>
                ) : null}
              </>
            ) : null}
          </Box>

          {request ? (
            <Box as="footer" className={hrChrome.hrJoinDrawerFooter}>
              {footerError ? (
                <Text
                  variant="caption"
                  color="danger"
                  role="alert"
                  className={hrChrome.hrJoinDrawerFooterText}
                >
                  {footerError}
                </Text>
              ) : null}
              {!pending ? (
                <Text
                  variant="caption"
                  color="secondary"
                  className={hrChrome.hrJoinDrawerFooterText}
                >
                  This request was already handled.
                </Text>
              ) : rejecting ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'cancel' })}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={confirmReject}
                    loading={savingMode === 'REJECT'}
                    disabled={busy || reasonTooLong(reason)}
                  >
                    Confirm reject
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => dispatch({ type: 'reject' })}
                    disabled={busy}
                  >
                    Reject
                  </Button>
                  {match ? null : (
                    <Button
                      type="button"
                      variant="solid"
                      onClick={() => doApprove('CREATE')}
                      loading={savingMode === 'CREATE'}
                      disabled={busy}
                    >
                      Approve
                    </Button>
                  )}
                </>
              )}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Drawer>
  );
}
