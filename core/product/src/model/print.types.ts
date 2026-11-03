/**
 * Dot matrix print types. These mirror the backend DTOs in `inventory-api` `core/product`
 * (`CreatePrintJobRequest`, `PrintJobResponse`, `ReportPrintOutcomeRequest`,
 * `PrintOutcomeResponse`, `PrintBridgeObservation`, `PrintBridgeStatusResponse`,
 * `PrintBridgeConnectionResponse`).
 */

/** Which record is printed: a sale, a customer refund or a return to a vendor. */
export type PrintDocumentSource = 'SALE' | 'REFUND' | 'VENDOR_RETURN';

export type PrintDocumentKind = 'INVOICE' | 'ESTIMATE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

/** The bridge on this computer, as the backend judged it. */
export type PrintBridgeState = 'NOT_DETECTED' | 'OUTDATED' | 'CONNECTED';

/** What to do with a print job. Chosen by the backend, never here. */
export type PrintAction = 'BRIDGE' | 'DOWNLOAD' | 'IN_PROGRESS';

export type PrintActionReason = 'BRIDGE_UNAVAILABLE' | 'PRINT_IN_PROGRESS';

/** What the browser saw when it sent a job to the bridge. */
export type PrintObservation =
  | 'PRINTED'
  | 'FAILED'
  | 'STILL_QUEUED'
  | 'UNREACHABLE'
  | 'DUPLICATE'
  | 'REJECTED'
  /** This browser stopped tracking a queued job after its in-flight time without seeing it finish. */
  | 'EXPIRED';

/** What a reported print means, as the backend decided. */
export type PrintOutcome =
  | 'PRINTED'
  | 'FAILED_PRINTER'
  | 'STILL_QUEUED'
  | 'BRIDGE_UNREACHABLE'
  | 'ALREADY_SENT'
  | 'BRIDGE_REJECTED'
  /** Nobody saw the job finish. Unknown, not failed: it may well have printed. */
  | 'UNCONFIRMED';

/** Where the bridge listens on the shop PC and how long to wait on it. Set by the backend. */
export interface PrintBridgeConnection {
  /** Loopback origin, e.g. `http://127.0.0.1:9110`. */
  origin: string;
  /** Timeout for `GET /health` and `GET /jobs`. */
  healthTimeoutMs: number;
  /** Timeout for `POST /print`. */
  printTimeoutMs: number;
}

export interface PrintBridgeObservation {
  reachable: boolean;
  version: string | null;
  selectedPrinter: string | null;
}

export interface PrintBridgeStatus {
  state: PrintBridgeState;
  installedVersion: string | null;
  selectedPrinter: string | null;
  latestVersion: string;
  minimumVersion: string;
  downloadUrl: string | null;
}

export interface CreatePrintJobRequest {
  source: PrintDocumentSource;
  documentId: string;
  bridge: PrintBridgeObservation;
  /**
   * How long ago this browser sent the same document without seeing it finish, in ms; null
   * when it has not. From `lib/printJobCache.ts`; the backend decides what it means.
   */
  pendingAgeMs: number | null;
}

export interface PrintDownload {
  filename: string;
  content: string;
}

export interface PrintJobPlan {
  action: PrintAction;
  reason: PrintActionReason | null;
  bridgeState: PrintBridgeState;
  documentKind: PrintDocumentKind;
  /** The number on the document, e.g. T001148, for a message about it later. */
  documentNumber: string | null;
  /** Sent to the bridge unchanged. Never read here. */
  bridgeRequest: unknown;
  download: PrintDownload | null;
  poll: { intervalMs: number; budgetMs: number } | null;
  /** How long a sent job stays in `lib/printJobCache.ts` before it counts as unconfirmed. */
  inFlightTtlMs: number;
}

export interface ReportPrintOutcomeRequest {
  source: PrintDocumentSource;
  observation: PrintObservation;
  bridgeJobId: string | null;
  error: string | null;
}

export interface PrintOutcomeResult {
  outcome: PrintOutcome;
  shouldClose: boolean;
  retryable: boolean;
  downloadInstead: boolean;
  error: string | null;
}
