/**
 * Dot matrix print types. These mirror the backend DTOs in `inventory-api` `core/product`
 * (`CreatePrintJobRequest`, `PrintJobResponse`, `ReportPrintOutcomeRequest`,
 * `PrintOutcomeResponse`, `PrintBridgeObservation`, `PrintBridgeStatusResponse`).
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
  | 'REJECTED';

/** What a reported print means, as the backend decided. */
export type PrintOutcome =
  | 'PRINTED'
  | 'FAILED_PRINTER'
  | 'STILL_QUEUED'
  | 'BRIDGE_UNREACHABLE'
  | 'ALREADY_SENT'
  | 'BRIDGE_REJECTED';

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
}

export interface PrintDownload {
  filename: string;
  content: string;
}

export interface PrintJobPlan {
  printJobId: string;
  action: PrintAction;
  reason: PrintActionReason | null;
  bridgeState: PrintBridgeState;
  documentKind: PrintDocumentKind;
  /** Sent to the bridge unchanged. Never read here. */
  bridgeRequest: unknown;
  download: PrintDownload | null;
  poll: { intervalMs: number; budgetMs: number } | null;
}

export interface ReportPrintOutcomeRequest {
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
