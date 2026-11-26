import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  ChoiceList,
  FilterDropdown,
  FilterStrip,
  Inline,
  LinkButton,
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
  VisuallyHidden,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  BULK_JOIN_MAX,
  type BulkJoinResult,
  type JoinRequestListStatus,
  type JoinRequestRow as JoinRequestRowData,
  type JoinRequestsPageResponse,
} from '@inventory-platform/hr/types';
import {
  useApproveJoinRequestMutation,
  useBulkJoinRequestsMutation,
  useJoinRequestsQuery,
  useRejectJoinRequestMutation,
} from '../queries/hooks';
import { JoinRequestRow, RequestedTime } from './JoinRequestRow';
import { JoinRequestPhoto } from './JoinRequestPhoto';
import { RejectReasonModal } from './RejectReasonModal';

const STATUS_OPTIONS: { value: JoinRequestListStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
];
const COLUMNS = 7;

/** Page totals as the server sends them; absent on an older backend. */
export interface JoinRequestPageMeta {
  totalItems?: number;
  totalPages?: number;
}

/**
 * The page totals of `GET /hr/join-requests`. The wire type says `page` is a zero-based number
 * with `size / totalItems / totalPages` beside it (backend task 6.4); an older server still nests
 * them under `page`. Read both so the pager works against either; without totals the pager only
 * knows "a full page may have a next one".
 */
export function joinRequestPageMeta(
  data: JoinRequestsPageResponse | undefined,
): JoinRequestPageMeta {
  if (!data) return {};
  const nested = data.page as unknown;
  const source: Partial<Record<'totalItems' | 'totalPages', unknown>> =
    nested != null && typeof nested === 'object'
      ? (nested as Record<string, unknown>)
      : (data as unknown as Record<string, unknown>);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  return { totalItems: num(source.totalItems), totalPages: num(source.totalPages) };
}

/**
 * The result line of a bulk action (R4.6): "Approved 6. 2 need your review", "Rejected 3",
 * "Approved 4. 1 could not be approved". Exported for tests.
 */
export function bulkResultText(decision: 'approve' | 'reject', result: BulkJoinResult): string {
  const parts = [`${decision === 'approve' ? 'Approved' : 'Rejected'} ${result.approved}.`];
  if (result.skipped.length > 0) {
    parts.push(
      `${result.skipped.length} need${result.skipped.length === 1 ? 's' : ''} your review`,
    );
  }
  if (result.failed.length > 0) {
    parts.push(
      `${result.failed.length} could not be ${decision === 'approve' ? 'approved' : 'rejected'}`,
    );
  }
  return parts.join(' ').replace(/\.$/, '');
}

interface BulkOutcome {
  decision: 'approve' | 'reject';
  result: BulkJoinResult;
  /** Names of the failed rows at the time, so the alert can say who even after the list moves. */
  names: Record<string, string>;
}

/**
 * The Join requests tab of the Employees page (R4.1–R4.7, R4.10): Pending or Rejected, newest
 * first, one row per request with the snapshot the worker submitted and nothing else (R4.2, R11.3);
 * Approve / Reject per row, a selection with **Approve selected** / **Reject selected**, and the
 * bulk result with the skipped rows highlighted. The row's and the toolbar's Reject keep the
 * `RejectReasonModal`; the drawer rejects inline (R4.16). Approve on a matched row opens the
 * drawer, whose match card asks link-or-create (R4.4, R4.15). The page is shown only to
 * ADD_EDIT_EMPLOYEES, so this component does not check the permission again.
 */
export function JoinRequestsTab() {
  const [status, setStatus] = useState<JoinRequestListStatus>('PENDING');
  const [statusOpen, setStatusOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [open, setOpen] = useState<{ id: string; intent: 'approve' | null } | null>(null);
  const [bulkReject, setBulkReject] = useState(false);
  const [rowReject, setRowReject] = useState<JoinRequestRowData | null>(null);
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);

  const list = useJoinRequestsQuery({ status, page, size });
  const approve = useApproveJoinRequestMutation();
  const reject = useRejectJoinRequestMutation();
  const bulk = useBulkJoinRequestsMutation();

  const rows = list.data?.items ?? [];
  const meta = joinRequestPageMeta(list.data);
  const pendingCount = list.data?.pendingCount ?? 0;

  // Rows that left the page (decided, or another filter) drop out of the selection.
  useEffect(() => {
    setSelected((prev) => {
      const onPage = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => onPage.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const changeStatus = (next: JoinRequestListStatus) => {
    setStatus(next);
    setPage(0);
    setSelected(new Set());
    setOutcome(null);
    setStatusOpen(false);
  };

  const toggle = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = (on: boolean) => setSelected(on ? new Set(rows.map((r) => r.id)) : new Set());

  const skippedIds = new Set(outcome?.result.skipped.map((s) => s.id) ?? []);
  const tooMany = selected.size > BULK_JOIN_MAX;

  const onRowApprove = (row: JoinRequestRowData) => {
    if (row.hasPossibleMatch) {
      // The choice needs the match itself (R4.4): the drawer loads it and asks.
      setOpen({ id: row.id, intent: 'approve' });
      return;
    }
    approve.mutate(
      { id: row.id, body: { mode: 'CREATE' } },
      {
        onSuccess: () => useNotify.success(`${row.name} added as an employee`),
        // 8038 "already handled" and friends, word for word; the list refreshes either way.
        onError: (err) => useNotify.error(err.message || 'Could not approve the request'),
      },
    );
  };

  const onRowReject = (reason: string | null) => {
    if (!rowReject) return;
    const row = rowReject;
    reject.mutate(
      { id: row.id, reason },
      {
        onSuccess: () => {
          setRowReject(null);
          useNotify.success(`${row.name}'s request rejected`);
        },
        onError: (err) => {
          setRowReject(null);
          useNotify.error(err.message || 'Could not reject the request');
        },
      },
    );
  };

  const runBulk = (decision: 'approve' | 'reject', reason: string | null = null) => {
    const ids = [...selected];
    const names = Object.fromEntries(rows.map((r) => [r.id, r.name]));
    bulk.mutate(
      { decision, ids, reason },
      {
        onSuccess: (result) => {
          setBulkReject(false);
          setSelected(new Set());
          setOutcome({ decision, result, names });
        },
        onError: (err) => {
          setBulkReject(false);
          useNotify.error(err.message || 'Could not update the selected requests');
        },
      },
    );
  };

  const busy = approve.isPending || reject.isPending || bulk.isPending;

  return (
    <Stack gap="md">
      <Inline gap="sm" justify="between" align="center" flexWrap>
        <FilterStrip aria-label="Join request filters">
          <FilterDropdown
            label="Status"
            value={STATUS_OPTIONS.find((o) => o.value === status)?.label}
            open={statusOpen}
            onOpenChange={setStatusOpen}
          >
            <ChoiceList
              aria-label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => changeStatus(v as JoinRequestListStatus)}
            />
          </FilterDropdown>
        </FilterStrip>
        {status === 'PENDING' ? (
          <Inline gap="sm" align="center" flexWrap>
            <Text variant="caption" color="secondary" aria-live="polite">
              {selected.size === 0
                ? `${pendingCount} pending`
                : `${selected.size} selected${
                    tooMany ? ` · at most ${BULK_JOIN_MAX} at a time` : ''
                  }`}
            </Text>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulkReject(true)}
              disabled={selected.size === 0 || tooMany || busy}
            >
              Reject selected
            </Button>
            <Button
              type="button"
              variant="solid"
              size="sm"
              onClick={() => runBulk('approve')}
              loading={bulk.isPending && !bulkReject}
              disabled={selected.size === 0 || tooMany || busy}
            >
              Approve selected
            </Button>
          </Inline>
        ) : null}
      </Inline>

      {outcome ? (
        <Alert variant={outcome.result.failed.length > 0 ? 'warning' : 'success'} role="status">
          <Stack gap="xs">
            <Text>{bulkResultText(outcome.decision, outcome.result)}</Text>
            {outcome.result.skipped.length > 0 ? (
              <Text variant="caption">
                The highlighted rows have a possible match. Open each one to link it to the existing
                employee or create a new one.
              </Text>
            ) : null}
            {outcome.result.failed.map((f) => (
              <Text key={f.id} variant="caption">
                {outcome.names[f.id] ?? 'One request'}: {f.message}
              </Text>
            ))}
          </Stack>
        </Alert>
      ) : null}

      {list.error ? <Alert variant="danger">{list.error.message}</Alert> : null}

      <Card>
        <CardBody>
          <Table aria-label="Join requests">
            <TableHead>
              <TableRow>
                <TableHeaderCell>
                  {status === 'PENDING' ? (
                    <Checkbox
                      id="hr-join-requests-select-all"
                      label={<VisuallyHidden>Select all on this page</VisuallyHidden>}
                      checked={allOnPage}
                      onChange={(e) => toggleAll(e.target.checked)}
                      disabled={rows.length === 0 || busy}
                    />
                  ) : null}
                </TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Requested</TableHeaderCell>
                <TableHeaderCell>Match</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.isLoading ? (
                <TableLoadingRow colSpan={COLUMNS} />
              ) : rows.length === 0 ? (
                <TableEmptyRow
                  colSpan={COLUMNS}
                  message={
                    status === 'PENDING'
                      ? 'No one is waiting to join'
                      : 'No rejected requests in the last 90 days'
                  }
                />
              ) : (
                rows.map((r) => {
                  const skipped = skippedIds.has(r.id);
                  return (
                    <TableRow
                      key={r.id}
                      data-skipped={skipped ? 'true' : undefined}
                      className={skipped ? hrChrome.hrJoinRowSkipped : undefined}
                    >
                      <TableCell>
                        {status === 'PENDING' ? (
                          <Checkbox
                            id={`hr-join-request-${r.id}`}
                            label={<VisuallyHidden>Select {r.name}</VisuallyHidden>}
                            checked={selected.has(r.id)}
                            onChange={(e) => toggle(r.id, e.target.checked)}
                            disabled={busy}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Inline gap="sm" align="center">
                          <JoinRequestPhoto
                            name={r.name}
                            photoUrl={r.photoUrl}
                            className={hrChrome.hrJoinRowAvatar}
                          />
                          <LinkButton onClick={() => setOpen({ id: r.id, intent: null })}>
                            {r.name}
                          </LinkButton>
                        </Inline>
                      </TableCell>
                      <TableCell>{r.phone || '—'}</TableCell>
                      <TableCell>{r.email || '—'}</TableCell>
                      <TableCell>
                        <RequestedTime at={r.requestedAt} variant="body" />
                      </TableCell>
                      <TableCell>
                        {r.hasPossibleMatch ? <Badge variant="warning">Possible match</Badge> : '—'}
                      </TableCell>
                      <TableCell>
                        {r.status === 'PENDING' ? (
                          <Inline gap="xs" flexWrap>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setRowReject(r)}
                              disabled={busy}
                            >
                              Reject
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onRowApprove(r)}
                              disabled={busy}
                            >
                              Approve
                            </Button>
                          </Inline>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <PaginationBar
        page={page}
        totalPages={meta.totalPages}
        totalItems={meta.totalItems}
        // Without totals, a short page is the last one.
        nextDisabled={meta.totalPages == null ? rows.length < size : undefined}
        pageSize={size}
        pageSizeOptions={[20, 50, 100, 200]}
        onPageChange={(n) => {
          setPage(n);
          setSelected(new Set());
        }}
        onPageSizeChange={(n) => {
          setSize(n);
          setPage(0);
          setSelected(new Set());
        }}
      />

      <JoinRequestRow id={open?.id ?? null} intent={open?.intent} onClose={() => setOpen(null)} />

      <RejectReasonModal
        open={rowReject != null}
        count={1}
        requesterName={rowReject?.name}
        saving={reject.isPending}
        onClose={() => setRowReject(null)}
        onConfirm={onRowReject}
      />
      <RejectReasonModal
        open={bulkReject}
        count={selected.size}
        saving={bulk.isPending}
        onClose={() => setBulkReject(false)}
        onConfirm={(reason) => runBulk('reject', reason)}
      />
    </Stack>
  );
}
