import { describe, expect, it } from 'vitest';
import { SERVER_MESSAGES } from './messages.js';
import {
  OAUTH_ACCOUNT_NOT_FOUND,
  OAUTH_ACCOUNT_NOT_FOUND_CODE,
  TOO_MANY_ATTEMPTS_WORKER,
  WORKER_ERROR_CODE_NUMBERS,
  WORKER_SERVER_MESSAGES,
  matchExitedMessage,
  matchLinkedElsewhereMessage,
  workerRefusalText,
} from './worker-messages.js';
import type { WorkerErrorCode } from './worker-messages.js';

/**
 * Copied word for word from `inventory-api` `core/common/.../constants/ErrorCode.java`
 * (8035–8047; 8042, 8043 and 8046 are gaps left by the removed legacy pairing flows, D11) and
 * `ErrorCode.HR_TOO_MANY_ATTEMPTS_WORKER_MESSAGE`. When the Java text changes, change this list
 * and `worker-messages.ts` together.
 */
const JAVA_ERROR_CODES: readonly { name: WorkerErrorCode; code: number; message: string }[] = [
  {
    name: 'HR_WORKER_HAS_SHOP',
    code: 8035,
    message: 'You are already part of a shop. Leave it first.',
  },
  { name: 'HR_WORKER_REQUEST_PENDING', code: 8036, message: 'You already have a request waiting.' },
  {
    name: 'HR_WORKER_LOGIN_IN_OTHER_SHOP',
    code: 8037,
    message: 'This login is already part of another shop.',
  },
  { name: 'HR_REQUEST_ALREADY_HANDLED', code: 8038, message: 'This request was already handled' },
  {
    name: 'HR_MATCH_LINKED_ELSEWHERE',
    code: 8039,
    message: '%s is already linked to another login',
  },
  { name: 'HR_MATCH_EXITED', code: 8040, message: '%s has exited. Create a new employee instead.' },
  {
    name: 'HR_PAIRING_WRONG_EMPLOYEE',
    code: 8041,
    message: 'This code is for a different employee. Ask your manager.',
  },
  {
    name: 'HR_TWO_CREDENTIALS',
    code: 8044,
    message: 'A request may carry a login or a phone signature, not both.',
  },
  { name: 'HR_WORKER_NOT_ACTIVE', code: 8045, message: 'You are not part of a shop.' },
  {
    name: 'HR_WORKER_ONLY',
    code: 8047,
    message:
      'This app is for workers. Ask your manager to link your login to your employee record from the Employees page.',
  },
];

describe('worker server refusal texts', () => {
  it('match ErrorCode 8035–8047 word for word, with their numbers', () => {
    for (const { name, code, message } of JAVA_ERROR_CODES) {
      expect(WORKER_SERVER_MESSAGES[name]).toBe(message);
      expect(WORKER_ERROR_CODE_NUMBERS[name]).toBe(code);
    }
  });

  it('cover every code once: 10 names, numbers 8035–8047 with exactly the gaps 8042, 8043, 8046', () => {
    const numbers = Object.values(WORKER_ERROR_CODE_NUMBERS).sort((a, b) => a - b);
    const gaps = [8042, 8043, 8046];
    expect(numbers).toEqual(
      Array.from({ length: 13 }, (_, i) => 8035 + i).filter((n) => !gaps.includes(n)),
    );
    expect(numbers).toHaveLength(10);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(Object.keys(WORKER_SERVER_MESSAGES).sort()).toEqual(
      JAVA_ERROR_CODES.map((c) => c.name).sort(),
    );
  });

  it('carries no text for the removed legacy pairing codes (8042, 8043, 8046; D11)', () => {
    const messages = WORKER_SERVER_MESSAGES as Record<string, string | undefined>;
    const numbers = WORKER_ERROR_CODE_NUMBERS as Record<string, number | undefined>;
    for (const legacy of [
      'HR_PAIRING_NEEDS_LOGIN',
      'HR_PAIRING_UPDATE_APP',
      'HR_PHONE_PAIRED_TO_OTHER',
    ]) {
      expect(messages[legacy], legacy).toBeUndefined();
      expect(numbers[legacy], legacy).toBeUndefined();
      expect(workerRefusalText(legacy)).toBe('Something went wrong. Try again.');
    }
    expect(Object.values(WORKER_ERROR_CODE_NUMBERS)).not.toContain(8042);
    expect(Object.values(WORKER_ERROR_CODE_NUMBERS)).not.toContain(8043);
    expect(Object.values(WORKER_ERROR_CODE_NUMBERS)).not.toContain(8046);
  });

  it('8028 has the worker-path text, distinct from the punch-path text', () => {
    expect(TOO_MANY_ATTEMPTS_WORKER).toBe('Too many attempts, try again later');
    expect(TOO_MANY_ATTEMPTS_WORKER).not.toBe('Too many attempts, wait a minute');
  });

  it('4004 OAUTH_ACCOUNT_NOT_FOUND mirrors the Java text word for word and sits in the user range, apart from the 80xx codes (R1.10, DD20)', () => {
    // Copied from `ErrorCode.OAUTH_ACCOUNT_NOT_FOUND(4004, "...", HttpStatus.UNAUTHORIZED)`.
    expect(OAUTH_ACCOUNT_NOT_FOUND).toBe(
      'No account found for this Google account. Please sign up first.',
    );
    expect(OAUTH_ACCOUNT_NOT_FOUND_CODE).toBe(4004);
    expect(OAUTH_ACCOUNT_NOT_FOUND_CODE).toBeGreaterThanOrEqual(4000);
    expect(OAUTH_ACCOUNT_NOT_FOUND_CODE).toBeLessThan(5000);
    // Not a worker-path (80xx) code: it is `/auth/login`'s answer, so it is not in those tables.
    expect(Object.values(WORKER_ERROR_CODE_NUMBERS)).not.toContain(OAUTH_ACCOUNT_NOT_FOUND_CODE);
    expect(Object.values(WORKER_SERVER_MESSAGES)).not.toContain(OAUTH_ACCOUNT_NOT_FOUND);
    expect(Object.values(SERVER_MESSAGES)).not.toContain(OAUTH_ACCOUNT_NOT_FOUND);
    expect(OAUTH_ACCOUNT_NOT_FOUND.trim()).toBe(OAUTH_ACCOUNT_NOT_FOUND);
  });

  it('fills the employee code into the two templates (R4.5)', () => {
    expect(matchLinkedElsewhereMessage('EMP-014')).toBe(
      'EMP-014 is already linked to another login',
    );
    expect(matchExitedMessage('EMP-014')).toBe(
      'EMP-014 has exited. Create a new employee instead.',
    );
  });

  it('workerRefusalText prefers the server text, then the mirror, then a generic line', () => {
    expect(workerRefusalText('HR_WORKER_HAS_SHOP', 'server said so')).toBe('server said so');
    expect(workerRefusalText('HR_WORKER_HAS_SHOP', '  ')).toBe(
      WORKER_SERVER_MESSAGES.HR_WORKER_HAS_SHOP,
    );
    expect(workerRefusalText('HR_TOO_MANY_ATTEMPTS', null)).toBe(TOO_MANY_ATTEMPTS_WORKER);
    expect(workerRefusalText('SOMETHING_NEW')).toBe('Something went wrong. Try again.');
  });
});

/**
 * Task 9.2 — the design's "Error Handling" tables ("What the worker sees", "What the manager
 * sees"), keyed by situation, resolved the way the app and the inbox resolve them: through
 * `workerRefusalText(code)` when the server sent no text.
 */
const DESIGN_WORKER_TABLE: readonly { situation: string; code: string; text: string }[] = [
  {
    situation: 'Too many lookups / requests / sign-ups',
    code: 'HR_TOO_MANY_ATTEMPTS',
    text: 'Too many attempts, try again later',
  },
  {
    situation: 'Already part of a shop',
    code: 'HR_WORKER_HAS_SHOP',
    text: 'You are already part of a shop. Leave it first.',
  },
  {
    situation: 'Already have a pending request',
    code: 'HR_WORKER_REQUEST_PENDING',
    text: 'You already have a request waiting.',
  },
  {
    situation: 'Staff account without employee',
    code: 'HR_WORKER_ONLY',
    text: 'This app is for workers. Ask your manager to link your login to your employee record from the Employees page.',
  },
  {
    situation: 'Code is for someone else',
    code: 'HR_PAIRING_WRONG_EMPLOYEE',
    text: 'This code is for a different employee. Ask your manager.',
  },
];

const DESIGN_MANAGER_TABLE: readonly { situation: string; code: string; text: string }[] = [
  {
    situation: 'Decision on a request another approver already handled, or withdrawn',
    code: 'HR_REQUEST_ALREADY_HANDLED',
    text: 'This request was already handled',
  },
  {
    situation: 'Link to an employee linked to another login',
    code: 'HR_MATCH_LINKED_ELSEWHERE',
    text: 'EMP-014 is already linked to another login',
  },
  {
    situation: 'Link to an exited employee',
    code: 'HR_MATCH_EXITED',
    text: 'EMP-014 has exited. Create a new employee instead.',
  },
  {
    situation: 'Worker approved by another shop first',
    code: 'HR_WORKER_LOGIN_IN_OTHER_SHOP',
    text: 'This login is already part of another shop.',
  },
];

describe('design "Error Handling" tables (task 9.2)', () => {
  it('"Google account not registered, from Sign in": the server text is the 4004 mirror and the app shows nothing of it (task 22.2, R1.10)', () => {
    // The row's "Text shown in the app" is "Nothing": the app routes on the code. What the server
    // sends (and the web shows) is the mirror, so `inferAccountErrorCode` can match it exactly.
    expect(OAUTH_ACCOUNT_NOT_FOUND).toBe(
      'No account found for this Google account. Please sign up first.',
    );
    // `workerRefusalText` is for the worker-path (80xx) codes: an unknown code falls to the generic line.
    expect(workerRefusalText('OAUTH_ACCOUNT_NOT_FOUND')).toBe('Something went wrong. Try again.');
  });

  it('"What the worker sees": every server-decided row resolves to the design text without a server message', () => {
    for (const row of DESIGN_WORKER_TABLE) {
      expect(workerRefusalText(row.code), row.situation).toBe(row.text);
      expect(workerRefusalText(row.code, null), row.situation).toBe(row.text);
      expect(workerRefusalText(row.code, '   '), row.situation).toBe(row.text);
    }
  });

  it('"What the manager sees": every coded row has the design text, templates filled with the employee code', () => {
    const filled: Record<string, string> = {
      ...WORKER_SERVER_MESSAGES,
      HR_MATCH_LINKED_ELSEWHERE: matchLinkedElsewhereMessage('EMP-014'),
      HR_MATCH_EXITED: matchExitedMessage('EMP-014'),
    };
    for (const row of DESIGN_MANAGER_TABLE) {
      expect(filled[row.code], row.situation).toBe(row.text);
    }
  });

  it('every one of the 10 codes resolves to its own mirror and is a trimmed, non-empty sentence', () => {
    for (const code of Object.keys(WORKER_SERVER_MESSAGES) as WorkerErrorCode[]) {
      const text = WORKER_SERVER_MESSAGES[code];
      expect(workerRefusalText(code)).toBe(text);
      expect(text.length).toBeGreaterThan(0);
      expect(text.trim()).toBe(text);
    }
  });

  it('only the two manager templates carry %s, and a filled template carries none', () => {
    const templates = (Object.keys(WORKER_SERVER_MESSAGES) as WorkerErrorCode[]).filter((code) =>
      WORKER_SERVER_MESSAGES[code].includes('%s'),
    );
    expect(templates.sort()).toEqual(['HR_MATCH_EXITED', 'HR_MATCH_LINKED_ELSEWHERE']);
    for (const code of ['EMP-001', 'A', 'EMP-9999']) {
      expect(matchLinkedElsewhereMessage(code)).not.toContain('%s');
      expect(matchExitedMessage(code)).not.toContain('%s');
      expect(matchLinkedElsewhereMessage(code).startsWith(code)).toBe(true);
      expect(matchExitedMessage(code).startsWith(code)).toBe(true);
    }
  });

  it('the worker codes (8035–8047) share no name with the HR-module codes in messages.ts', () => {
    const hrModuleNames = new Set(Object.keys(SERVER_MESSAGES));
    for (const name of Object.keys(WORKER_SERVER_MESSAGES)) {
      expect(hrModuleNames.has(name), name).toBe(false);
    }
    // 8028 is the one code with two texts; the punch-path one stays in messages.ts.
    expect(SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS).toBe('Too many attempts, wait a minute');
    expect(workerRefusalText('HR_TOO_MANY_ATTEMPTS')).toBe(TOO_MANY_ATTEMPTS_WORKER);
  });
});
