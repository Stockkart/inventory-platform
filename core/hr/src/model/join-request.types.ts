/**
 * Worker join requests as the manager UI sees them (worker-app R4). The wire shapes live in
 * `@inventory-platform/attendance-protocol` so the Expo app and this module cannot drift; this
 * file re-exports what `core/hr` uses and adds the UI-side constants and query parameters.
 *
 * `EmployeeStatus` is not re-exported: `employee.types.ts` already defines the same union.
 */
import type { WorkerJoinStatus } from '@inventory-platform/attendance-protocol';

export type {
  ApproveJoinRequestRequest,
  ApproveMode,
  BulkJoinFailed,
  BulkJoinRequest,
  BulkJoinResult,
  BulkJoinSkipped,
  BulkSkipReason,
  JoinOutcome,
  JoinRequestDecision,
  JoinRequestDetail,
  JoinRequestRow,
  JoinRequestsPageResponse,
  PossibleMatch,
  RejectJoinRequestRequest,
  WorkerJoinStatus,
} from '@inventory-platform/attendance-protocol';

/** The two filters the Join requests tab offers (R4.1); the server lists one status at a time. */
export type JoinRequestListStatus = Extract<WorkerJoinStatus, 'PENDING' | 'REJECTED'>;

/** Query params of `GET /hr/join-requests` (backend default page 0, size 20, max 200). */
export interface JoinRequestListParams {
  status: JoinRequestListStatus;
  page?: number;
  size?: number;
}

/** Page size cap of `GET /hr/join-requests` (R11.3). */
export const JOIN_REQUEST_PAGE_MAX = 200;

/** Most ids one bulk approve or reject may carry (R4.6). */
export const BULK_JOIN_MAX = 50;

/** Longest rejection reason, in characters after trimming (R4.7). */
export const REJECT_REASON_MAX = 200;

/**
 * How often the inbox query re-reads the list while the Employees page is open: the tab count
 * follows `pendingCount` at the same cadence as the bell (design: "refreshed every 60 s").
 */
export const JOIN_REQUESTS_POLL_MS = 60_000;

/** Decided requests are kept this long before the TTL removes them (R4.12, R11.3). */
export const JOIN_REQUEST_RETENTION_DAYS = 90;

/**
 * The rejection reason as the server stores it (R4.7, D13): trimmed; whitespace-only becomes
 * "no reason" (`null`). Longer than {@link REJECT_REASON_MAX} is left for the server to refuse
 * with its own message, so the text the user sees is the server's.
 */
export function normaliseRejectReason(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}
