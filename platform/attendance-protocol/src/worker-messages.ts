/**
 * The sentences Stockkart Team (worker-app) and the manager's Join requests inbox show word
 * for word: `inventory-api` `ErrorCode` 8035–8047 and the worker-path text of 8028
 * (`ErrorCode.HR_TOO_MANY_ATTEMPTS_WORKER_MESSAGE`). Server refusals arrive as `data.message` and
 * are shown as received; the mirrors exist so the app can show the same text for a refusal it
 * reproduces locally and so tests can assert the exact wording.
 *
 * Codes 8042, 8043 and 8046 are unused: they belonged to the removed legacy pairing flows (design
 * D11) and the gaps are kept so the other codes do not move.
 *
 * One code from the **user range** is mirrored here too: `OAUTH_ACCOUNT_NOT_FOUND` (4004, 401), the
 * answer of `POST /auth/login` when Google verified the token but no Stockkart account exists for
 * it (worker-app R1.10, DD20). The web shows its text; the Stockkart Team app never does: it turns
 * the code into the phone step in `signup` mode with the same ID token. The mirror exists so
 * `inferAccountErrorCode` matches the code, not a sentence, and so both sides test the exact text.
 *
 * Source of truth: `core/common/.../constants/ErrorCode.java`. Change it there first, then here.
 * The HR-module codes 8022–8034 live in `messages.ts`.
 */

/** Backend `ErrorCode` names a worker-app or inbox request can receive (8035–8047, with gaps). */
export type WorkerErrorCode =
  | 'HR_WORKER_HAS_SHOP'
  | 'HR_WORKER_REQUEST_PENDING'
  | 'HR_WORKER_LOGIN_IN_OTHER_SHOP'
  | 'HR_REQUEST_ALREADY_HANDLED'
  | 'HR_MATCH_LINKED_ELSEWHERE'
  | 'HR_MATCH_EXITED'
  | 'HR_PAIRING_WRONG_EMPLOYEE'
  | 'HR_TWO_CREDENTIALS'
  | 'HR_WORKER_NOT_ACTIVE'
  | 'HR_WORKER_ONLY';

/** Numeric `ErrorCode` values, for logs and tests; the app matches on the name. */
export const WORKER_ERROR_CODE_NUMBERS: Readonly<Record<WorkerErrorCode, number>> = {
  HR_WORKER_HAS_SHOP: 8035,
  HR_WORKER_REQUEST_PENDING: 8036,
  HR_WORKER_LOGIN_IN_OTHER_SHOP: 8037,
  HR_REQUEST_ALREADY_HANDLED: 8038,
  HR_MATCH_LINKED_ELSEWHERE: 8039,
  HR_MATCH_EXITED: 8040,
  HR_PAIRING_WRONG_EMPLOYEE: 8041,
  HR_TWO_CREDENTIALS: 8044,
  HR_WORKER_NOT_ACTIVE: 8045,
  HR_WORKER_ONLY: 8047,
};

/**
 * Server refusal texts by `ErrorCode` name. `HR_MATCH_LINKED_ELSEWHERE` and `HR_MATCH_EXITED` are
 * templates whose `%s` is the employee code; use {@link matchLinkedElsewhereMessage} and
 * {@link matchExitedMessage}.
 */
export const WORKER_SERVER_MESSAGES: Readonly<Record<WorkerErrorCode, string>> = {
  HR_WORKER_HAS_SHOP: 'You are already part of a shop. Leave it first.',
  HR_WORKER_REQUEST_PENDING: 'You already have a request waiting.',
  HR_WORKER_LOGIN_IN_OTHER_SHOP: 'This login is already part of another shop.',
  HR_REQUEST_ALREADY_HANDLED: 'This request was already handled',
  HR_MATCH_LINKED_ELSEWHERE: '%s is already linked to another login',
  HR_MATCH_EXITED: '%s has exited. Create a new employee instead.',
  HR_PAIRING_WRONG_EMPLOYEE: 'This code is for a different employee. Ask your manager.',
  HR_TWO_CREDENTIALS: 'A request may carry a login or a phone signature, not both.',
  HR_WORKER_NOT_ACTIVE: 'You are not part of a shop.',
  HR_WORKER_ONLY:
    'This app is for workers. Ask your manager to link your login to your employee record from the Employees page.',
};

/**
 * `HR_TOO_MANY_ATTEMPTS` (8028) on the worker paths: shop lookup, join request, sign-up (R3.8,
 * R14.1). The punch and pairing paths keep "Too many attempts, wait a minute" (`messages.ts`).
 */
export const TOO_MANY_ATTEMPTS_WORKER = 'Too many attempts, try again later';

/** `ErrorCode.OAUTH_ACCOUNT_NOT_FOUND`'s number (user range, 4000–4999; R1.10, DD20). */
export const OAUTH_ACCOUNT_NOT_FOUND_CODE = 4004;

/**
 * `OAUTH_ACCOUNT_NOT_FOUND` (4004, HTTP 401): `POST /auth/login` with a Google ID token that
 * verified but names no Stockkart account. Word for word the Java enum's text (R1.10, DD20). The
 * app matches this text to the code and opens the phone step in `signup` mode; it never shows the
 * sentence.
 */
export const OAUTH_ACCOUNT_NOT_FOUND =
  'No account found for this Google account. Please sign up first.';

/** `HR_MATCH_LINKED_ELSEWHERE` with the employee code filled in: "EMP-014 is already linked to another login". */
export function matchLinkedElsewhereMessage(employeeCode: string): string {
  return WORKER_SERVER_MESSAGES.HR_MATCH_LINKED_ELSEWHERE.replace('%s', employeeCode);
}

/** `HR_MATCH_EXITED` with the employee code filled in: "EMP-014 has exited. Create a new employee instead.". */
export function matchExitedMessage(employeeCode: string): string {
  return WORKER_SERVER_MESSAGES.HR_MATCH_EXITED.replace('%s', employeeCode);
}

/**
 * What the app or inbox shows for a worker-path refusal by code; falls back to the server's own
 * text, then to the mirror, then to a generic line. `HR_TOO_MANY_ATTEMPTS` without a server text
 * gets the worker wording.
 */
export function workerRefusalText(code: string, serverMessage?: string | null): string {
  if (serverMessage && serverMessage.trim().length > 0) {
    return serverMessage;
  }
  if (code === 'HR_TOO_MANY_ATTEMPTS') {
    return TOO_MANY_ATTEMPTS_WORKER;
  }
  return (
    (WORKER_SERVER_MESSAGES as Record<string, string | undefined>)[code] ??
    'Something went wrong. Try again.'
  );
}
