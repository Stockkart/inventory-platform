import { describe, expect, it } from 'vitest';
import {
  ASK_MANAGER_TO_MARK,
  DUPLICATE_SENTENCE,
  FLAG_SENTENCES,
  REFUSALS_ENDING_WITH_ASK_MANAGER,
  SAVED_OFFLINE,
  SERVER_MESSAGES,
  endsWithAskManagerToMark,
  flagSentence,
  pairingCodeLockedMessage,
  punchConfirmation,
  refusalText,
  waitingToSendLine,
  withAskManagerToMark,
} from './messages.js';
import type { PunchFlag } from './types.js';

describe('server refusal texts', () => {
  it('match the backend ErrorCode and SelfCheckInService texts word for word', () => {
    expect(SERVER_MESSAGES.HR_APP_OFF).toBe(
      'Your shop has not turned on the Attendance app. Ask your manager to mark your attendance.',
    );
    expect(SERVER_MESSAGES.HR_APP_NOT_PAIRED).toBe(
      'This phone is no longer paired. Ask your manager.',
    );
    expect(SERVER_MESSAGES.HR_APP_NOT_VERIFIED).toBe(
      'This phone could not be verified. Ask your manager to re-pair it. Ask your manager to mark your attendance.',
    );
    expect(SERVER_MESSAGES.HR_APP_TOO_LATE).toBe(
      'Too late to send this check-in. Ask your manager to mark your attendance.',
    );
    expect(SERVER_MESSAGES.HR_APP_CLOCK_WRONG).toBe(
      "Your phone's clock is wrong. Fix the time, then ask your manager to mark your attendance.",
    );
    expect(SERVER_MESSAGES.HR_FAKE_LOCATION).toBe('Fake location detected');
    expect(SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS).toBe('Too many attempts, wait a minute');
    expect(SERVER_MESSAGES.HR_OUTSIDE_SHOP).toBe("You're not at the shop");
    expect(SERVER_MESSAGES.HR_LOCATION_UNCLEAR).toBe(
      'Location is not clear, please try again near a window',
    );
    expect(SERVER_MESSAGES.HR_EMPLOYEE_NOT_EMPLOYED).toBe("You are not employed on today's date");
    expect(SERVER_MESSAGES.HR_DAY_HAS_LEAVE).toBe('You are on approved leave today');
    expect(SERVER_MESSAGES.HR_PERIOD_LOCKED).toBe(
      'Payroll for this month is finalised, so attendance cannot be recorded',
    );
  });

  it('R7.10: refusals the worker cannot fix end with the exact sentence', () => {
    expect(ASK_MANAGER_TO_MARK).toBe('Ask your manager to mark your attendance.');
    for (const code of ['HR_APP_OFF', 'HR_APP_NOT_VERIFIED', 'HR_APP_TOO_LATE'] as const) {
      expect(endsWithAskManagerToMark(SERVER_MESSAGES[code])).toBe(true);
      expect(refusalText(code, SERVER_MESSAGES[code])).toBe(SERVER_MESSAGES[code]);
    }
    // R3.2 fixes the not-paired text; the app adds the R7.10 line itself.
    expect(endsWithAskManagerToMark(SERVER_MESSAGES.HR_APP_NOT_PAIRED)).toBe(false);
    const shown = refusalText('HR_APP_NOT_PAIRED', SERVER_MESSAGES.HR_APP_NOT_PAIRED);
    expect(shown).toBe(
      'This phone is no longer paired. Ask your manager.\nAsk your manager to mark your attendance.',
    );
    expect(endsWithAskManagerToMark(shown)).toBe(true);
    for (const code of REFUSALS_ENDING_WITH_ASK_MANAGER) {
      expect(endsWithAskManagerToMark(refusalText(code, SERVER_MESSAGES[code]))).toBe(true);
    }
  });

  it('withAskManagerToMark is idempotent', () => {
    const once = withAskManagerToMark('Fake location detected');
    expect(once).toBe('Fake location detected\nAsk your manager to mark your attendance.');
    expect(withAskManagerToMark(once)).toBe(once);
    expect(withAskManagerToMark(SERVER_MESSAGES.HR_APP_OFF)).toBe(SERVER_MESSAGES.HR_APP_OFF);
  });

  it('refusalText prefers the server text and falls back to the mirror', () => {
    expect(refusalText('HR_FAKE_LOCATION', 'Fake location detected')).toBe(
      'Fake location detected',
    );
    expect(refusalText('HR_FAKE_LOCATION', null)).toBe('Fake location detected');
    expect(refusalText('HR_FAKE_LOCATION', '   ')).toBe('Fake location detected');
    expect(refusalText('SOMETHING_NEW', 'Server says so')).toBe('Server says so');
    expect(refusalText('SOMETHING_NEW')).toBe('Something went wrong. Try again.');
  });

  it('pairingCodeLockedMessage fills the minutes', () => {
    expect(pairingCodeLockedMessage(15)).toBe(
      'Too many wrong codes. Wait 15 minutes and try again.',
    );
    expect(pairingCodeLockedMessage(0.2)).toBe(
      'Too many wrong codes. Wait 1 minutes and try again.',
    );
  });
});

describe('confirmation screen (R4.7, R4.8)', () => {
  it('formats the direction and server time', () => {
    expect(punchConfirmation('IN', '09:12')).toBe('Checked in at 09:12');
    expect(punchConfirmation('OUT', '18:05')).toBe('Checked out at 18:05');
  });

  it('has one plain sentence per flag', () => {
    const expected: Record<Exclude<PunchFlag, 'LOCKED_PERIOD'>, string> = {
      OUTSIDE_SHOP: 'Outside shop — your manager will see this',
      LOW_ACCURACY: 'Location unclear — your manager will see this',
      NO_LOCATION: 'No location — your manager will see this',
      FAKE_LOCATION: 'Fake location — your manager will see this',
      RECORDED_OFFLINE: 'Recorded offline — your manager will see this',
    };
    for (const [flag, sentence] of Object.entries(expected)) {
      expect(FLAG_SENTENCES[flag as PunchFlag]).toBe(sentence);
      expect(flagSentence(flag)).toBe(sentence);
    }
    expect(flagSentence('SOME_NEW_FLAG')).toBe('Some new flag — your manager will see this');
    expect(DUPLICATE_SENTENCE).toBe(
      "This is a duplicate of your earlier punch, so today's times did not change",
    );
  });
});

describe('offline (R6.3, R6.16)', () => {
  it('saved and waiting lines', () => {
    expect(SAVED_OFFLINE).toBe('Saved on your phone. It will be sent when you have network.');
    expect(waitingToSendLine(0)).toBeNull();
    expect(waitingToSendLine(1)).toBe('1 punch waiting to be sent');
    expect(waitingToSendLine(2)).toBe('2 punches waiting to be sent');
  });
});
