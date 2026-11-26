/**
 * Wire types for Stockkart Team (worker-app), 1:1 with `com.inventory.hr.rest.dto` and
 * `com.inventory.user.rest.dto` in `inventory-api` (`WorkerController` `/api/v1/hr/worker/**`,
 * `JoinRequestInboxController` `/api/v1/hr/join-requests/**`).
 * Shared by the Expo app (`apps/attendance`) and the manager UI (`core/hr`) so the two cannot drift.
 *
 * Conventions as in `types.ts`: instants are ISO strings, dates `yyyy-MM-dd`, times `HH:mm`
 * (Asia/Kolkata), enums travel as their constant names, ids are opaque 24-hex strings. Fields the
 * server may leave out or send as `null` are typed `?: T | null`.
 *
 * Nothing here can carry a token, photo bytes, pay, bank or UPI details, an Aadhaar or PAN number
 * (R8.9, R11.2): the photo travels as a URL the client fetches with its own session.
 */
import type { PairingState, PunchDirection } from './types.js';

// ── Enums (string-literal unions of the backend constants) ───────────────────

/**
 * Backend `WorkerJoinStatus`. `APPROVING` is the lock held inside the approval transaction; a
 * client never sees it after commit, but the union carries it so a row can be typed as received.
 */
export type WorkerJoinStatus = 'PENDING' | 'APPROVING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

/** Backend `JoinOutcome`: how a request was closed (R4.8–R4.11). */
export type JoinOutcome = 'APPROVED_CREATED' | 'APPROVED_LINKED' | 'REJECTED' | 'WITHDRAWN';

/** Backend `UserRole` as the Stockkart Team app may meet it (`SUPER_USER` never reaches these endpoints). */
export type WorkerAccountRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WORKER' | 'SUPER_USER';

/** Backend `EmployeeStatus`. */
export type EmployeeStatus = 'ACTIVE' | 'EXITED';

/**
 * Backend `HrNotificationType`: the three HR-module leave types plus the four worker-app types
 * (R4.13, R8.7, R10.2). An approval in LINK mode sends `JOIN_REQUEST_APPROVED` like any other
 * (R10.2). A type this version does not know is rendered as plain text, never thrown.
 */
export type HrNotificationType =
  | 'LEAVE_REQUESTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'JOIN_REQUEST_RECEIVED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'PROFILE_REQUESTED';

/** The four notification types this feature adds, for exhaustive rendering tests. */
export const WORKER_NOTIFICATION_TYPES: readonly HrNotificationType[] = [
  'JOIN_REQUEST_RECEIVED',
  'JOIN_REQUEST_APPROVED',
  'JOIN_REQUEST_REJECTED',
  'PROFILE_REQUESTED',
];

/**
 * The module keys this app version knows (`WorkerModules.forShop`, design DD10). The server's list
 * is `string[]`: a key not in this union is shown as the "Update the app to use this" tile (R6.6).
 */
export type ModuleKey = 'ATTENDANCE' | 'HISTORY' | 'PROFILE';

/** Every {@link ModuleKey}, in the order the server sends them today. */
export const MODULE_KEYS: readonly ModuleKey[] = ['ATTENDANCE', 'HISTORY', 'PROFILE'];

/** True when `key` is a {@link ModuleKey} this app version knows. */
export function isModuleKey(key: string): key is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(key);
}

/** `WorkerStateResponse.state`, decided by the server in R6.1 order. */
export type WorkerState = 'NO_SHOP' | 'PENDING' | 'ACTIVE' | 'STAFF_NO_EMPLOYEE';

/** `ApproveJoinRequestRequest.mode` (R4.4). */
export type ApproveMode = 'CREATE' | 'LINK';

/** Why a bulk approve skipped a row: it has a possible match and needs a human choice (R4.6). */
export type BulkSkipReason = 'POSSIBLE_MATCH';

// ── Notifications (`HrNotificationResponse`, `HrAccountNotificationsResponse`) ─────

/** `HrNotificationResponse`: one inbox row; the text has names, shop names, dates and reasons only. */
export interface HrNotificationResponse {
  id: string;
  type: HrNotificationType;
  leaveRequestId?: string | null;
  /** The join request this is about (R4.13); null for other types. */
  joinRequestId?: string | null;
  /** Plain-English line written by the server. */
  text: string;
  /** ISO instant. */
  createdAt: string;
  read: boolean;
}

/**
 * `GET /api/v1/hr/worker/notifications` (`HrAccountNotificationsResponse`): the rows addressed to
 * the account across every shop, unread first then newest, at most 20, and the number still unread
 * (R10.1).
 */
export interface WorkerNotificationsResponse {
  items: HrNotificationResponse[];
  unread: number;
}

/** `POST /api/v1/hr/worker/notifications/{id}/read` response. */
export interface MarkNotificationReadResponse {
  read: boolean;
}

// ── Worker state (`GET /api/v1/hr/worker/me`) ────────────────────────────────

/** `WorkerStateResponse.account`: the signed-in account as the app shows it. */
export interface WorkerAccount {
  userId: string;
  name: string;
  email: string;
  /** 10 digits; may be null for a staff account created before the phone was required. */
  phone?: string | null;
  /** `/api/v1/users/{userId}/photo`, fetched with the session; null when no photo (R11.5). */
  photoUrl?: string | null;
  role: WorkerAccountRole;
}

/**
 * `JoinRequestSelfResponse`: the worker's own view of a request (`POST /join-requests`,
 * `POST /join-requests/{id}/withdraw`, `WorkerStateResponse.request`). Never carries the
 * snapshot: the worker already knows their own details.
 */
export interface JoinRequestSelfResponse {
  id: string;
  shopName: string;
  status: WorkerJoinStatus;
  /** ISO instant, server clock (R3.4). */
  requestedAt: string;
}

/** `WorkerStateResponse.lastOutcome`: the last decided request within 90 days, NO_SHOP only (R4.12). */
export interface JoinRequestOutcome {
  id: string;
  status: Extract<WorkerJoinStatus, 'REJECTED' | 'WITHDRAWN'>;
  shopName: string;
  /** The approver's reason, word for word; null when none was given (R4.7, R4.12). */
  reason?: string | null;
  /** ISO instant. */
  decidedAt: string;
}

/** `WorkerStateResponse.shop`, ACTIVE only. */
export interface WorkerShop {
  shopId: string;
  shopName: string;
}

/** `WorkerStateResponse.employee`, ACTIVE only: the linked employee, without pay or bank fields. */
export interface WorkerEmployee {
  employeeId: string;
  code: string;
  name: string;
  /** yyyy-MM-dd. */
  joinDate: string;
  status: EmployeeStatus;
}

/** `WorkerStateResponse.pairing`, ACTIVE only (R7.1). */
export interface WorkerPairing {
  state: PairingState;
  /** PAIRED only. */
  pairingId?: string | null;
}

/** `WorkerStateResponse.today`, ACTIVE only: the Attendance tile line (R6.5). */
export interface WorkerToday {
  /** Today's attendance day, yyyy-MM-dd, Asia/Kolkata. */
  date: string;
  /** HH:mm of the first counted punch today; null = "Not checked in". */
  in?: string | null;
  /** HH:mm of the last counted punch today when there are two or more. */
  out?: string | null;
  nextDirection: PunchDirection;
}

/** `WorkerStateResponse.notifications`: the banner stack (R10.1). */
export interface WorkerNotificationsSummary {
  unread: number;
  /** Newest unread first, at most 3. */
  top: HrNotificationResponse[];
}

/**
 * `GET /api/v1/hr/worker/me` (`WorkerStateResponse`): everything the app needs to choose and draw
 * its screen (R6.1). The optional sections are present exactly as their comments say; `modules` is
 * `WorkerModules.forShop` when ACTIVE and `[]` otherwise (R6.4).
 */
export interface WorkerStateResponse {
  state: WorkerState;
  account: WorkerAccount;
  /** PENDING: the one open request. */
  request?: JoinRequestSelfResponse | null;
  /** NO_SHOP only: the last rejection or withdrawal within 90 days, if any. */
  lastOutcome?: JoinRequestOutcome | null;
  /** ACTIVE only. */
  shop?: WorkerShop | null;
  /** ACTIVE only. */
  employee?: WorkerEmployee | null;
  /** Server-computed; keys the app does not know become the update tile (R6.6). */
  modules: string[];
  /** ACTIVE only. */
  pairing?: WorkerPairing | null;
  /** ACTIVE only. */
  today?: WorkerToday | null;
  notifications: WorkerNotificationsSummary;
  /** ISO instant. */
  serverTime: string;
}

// ── Join flow (`/api/v1/hr/worker/shops`, `/join-requests`) ──────────────────

/** One shop the owner's email owns (R3.2). */
export interface ShopLookupRow {
  shopId: string;
  shopName: string;
  /** First whitespace-separated token of the owner's account name. */
  ownerFirstName: string;
}

/**
 * `GET /api/v1/hr/worker/shops?ownerEmail=` (`ShopLookupResponse`): the shops owned by that
 * email, or an empty list for every kind of miss (R3.3, R11.4).
 */
export interface ShopLookupResponse {
  shops: ShopLookupRow[];
}

/** `POST /api/v1/hr/worker/join-requests` body. */
export interface CreateJoinRequestRequest {
  shopId: string;
}

// ── Profile (`/api/v1/hr/worker/profile`) ───────────────────────────────────

/**
 * `GET /api/v1/hr/worker/profile` (`WorkerProfileResponse`): the Profile screen (R8.1). Has no
 * salary, bank, UPI, payment-method or amount field by construction (R11.2).
 */
export interface WorkerProfileResponse {
  name: string;
  phone?: string | null;
  email: string;
  photoUrl?: string | null;
  /** ACTIVE only. */
  shopName?: string | null;
  /** ACTIVE only. */
  employeeCode?: string | null;
  /** ACTIVE only, yyyy-MM-dd. */
  joinDate?: string | null;
  /** True when the shop has asked for profile details (R8.7). */
  profileRequested: boolean;
  pairingState: PairingState;
}

/** `PUT /api/v1/hr/worker/profile` and `PUT /api/v1/users/me/profile` body (R8.2). */
export interface UpdateWorkerProfileRequest {
  name: string;
  phone: string;
}

// ── Manager inbox (`/api/v1/hr/join-requests/**`) ───────────────────────────

/**
 * One row of the Join requests tab (`JoinRequestRow`): the snapshot as submitted, when it was
 * made, its status, and whether an employee of the shop looks like the same person; nothing else
 * (R4.2, R11.3). `photoUrl` is `/api/v1/users/{userId}/photo` when the account has a photo.
 */
export interface JoinRequestRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl?: string | null;
  /** ISO instant, server clock. */
  requestedAt: string;
  status: WorkerJoinStatus;
  /** True when the detail would show a {@link PossibleMatch}; bulk approve skips such rows (R4.6). */
  hasPossibleMatch: boolean;
}

/** `JoinRequestDetail.possibleMatch`: the shop employee with the same email or phone (R4.3). */
export interface PossibleMatch {
  employeeId: string;
  code: string;
  name: string;
  status: EmployeeStatus;
  /** True when the employee is already linked to a login. */
  linked: boolean;
}

/** `GET /api/v1/hr/join-requests/{id}` (`JoinRequestDetail`). */
export interface JoinRequestDetail extends JoinRequestRow {
  possibleMatch?: PossibleMatch | null;
}

/**
 * `GET /api/v1/hr/join-requests?status=&page=&size=` (`JoinRequestsPageResponse`), newest first.
 * The paging fields sit at the top level; this response does not use the `PageMeta` block of the
 * HR staff pages.
 */
export interface JoinRequestsPageResponse {
  items: JoinRequestRow[];
  /** Pending join requests for the shop, for the tab label (R4.1). */
  pendingCount: number;
  /** Zero-based page echoed back. */
  page: number;
  /** Page size used. */
  size: number;
  /** Rows in the requested status for the shop. */
  totalItems: number;
  totalPages: number;
}

/** `POST /api/v1/hr/join-requests/{id}/approve` body; `employeeId` is required with `LINK` (R4.4). */
export interface ApproveJoinRequestRequest {
  mode: ApproveMode;
  employeeId?: string | null;
}

/** `POST /api/v1/hr/join-requests/{id}/reject` body: 0–200 characters, blank = no reason (R4.7). */
export interface RejectJoinRequestRequest {
  reason?: string | null;
}

/** `JoinRequestDecision`: the answer to approve and reject (R4.5, R4.8–R4.10). */
export interface JoinRequestDecision {
  id: string;
  outcome: JoinOutcome;
  /** Approvals only: the created or linked employee. */
  employeeId?: string | null;
}

/** `POST /api/v1/hr/join-requests/bulk/approve` and `/bulk/reject` body (≤ 50 ids). */
export interface BulkJoinRequest {
  ids: string[];
  /** Reject only. */
  reason?: string | null;
}

/** One row bulk approve left Pending because it has a possible match (R4.6). */
export interface BulkJoinSkipped {
  id: string;
  reason: BulkSkipReason;
}

/** One row whose decision was refused; `message` is the server text, shown word for word. */
export interface BulkJoinFailed {
  id: string;
  message: string;
}

/** `BulkJoinResult`: `approved + skipped + failed` partition the selection (R4.6, Property 8). */
export interface BulkJoinResult {
  /** Number decided (approved, or rejected for bulk reject). */
  approved: number;
  skipped: BulkJoinSkipped[];
  failed: BulkJoinFailed[];
}
