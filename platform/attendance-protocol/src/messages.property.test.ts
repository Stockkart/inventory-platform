// Task 9.3 — R7.10: every refusal the worker cannot fix themselves ends with the exact sentence
// "Ask your manager to mark your attendance.", whether the server sent its text (with or without
// trailing whitespace) or the app fell back to its mirror; and the helper that appends the line is
// idempotent on any text.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ASK_MANAGER_TO_MARK,
  REFUSALS_ENDING_WITH_ASK_MANAGER,
  SERVER_MESSAGES,
  endsWithAskManagerToMark,
  refusalText,
  withAskManagerToMark,
} from './messages.js';

const NUM_RUNS = 100;

/** R7.10's list, written out so the test does not trust the constant it checks. */
const UNFIXABLE = [
  'HR_APP_OFF',
  'HR_APP_NOT_PAIRED',
  'HR_APP_NOT_VERIFIED',
  'HR_APP_TOO_LATE',
] as const;

const unfixable = fc.constantFrom(...UNFIXABLE);
const trailingWhitespace = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'), { maxLength: 4 })
  .map((a) => a.join(''));
/** What `data.message` may hold: missing, blank, or the server's own text as it sends it. */
const serverMessageFor = (code: (typeof UNFIXABLE)[number]) =>
  fc.oneof(
    fc.constant(undefined),
    fc.constant(null),
    fc.constant(''),
    trailingWhitespace,
    trailingWhitespace.map((ws) => SERVER_MESSAGES[code] + ws),
  );

describe('R7.10: unfixable refusals end with the ask-manager sentence', () => {
  it('Feature: HR-module, R7.10: unfixable refusals end with the ask-manager sentence — the constant list equals the requirement', () => {
    expect([...REFUSALS_ENDING_WITH_ASK_MANAGER].sort()).toEqual([...UNFIXABLE].sort());
    expect(ASK_MANAGER_TO_MARK).toBe('Ask your manager to mark your attendance.');
  });

  it('Feature: HR-module, R7.10: unfixable refusals end with the ask-manager sentence — the rendered text ends with the exact sentence', () => {
    fc.assert(
      fc.property(
        unfixable.chain((code) => fc.tuple(fc.constant(code), serverMessageFor(code))),
        ([code, serverMessage]) => {
          const shown = refusalText(code, serverMessage);
          expect(endsWithAskManagerToMark(shown)).toBe(true);
          expect(shown.trimEnd().endsWith(ASK_MANAGER_TO_MARK)).toBe(true);
          // The sentence is there once, as the last line or last sentence, and the rest of the
          // server's text is kept.
          expect(shown.split(ASK_MANAGER_TO_MARK)).toHaveLength(2);
          const serverText = (serverMessage ?? '').trim() || SERVER_MESSAGES[code];
          expect(shown.startsWith(serverText.trimEnd())).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('Feature: HR-module, R7.10: unfixable refusals end with the ask-manager sentence — appending the line is idempotent and always detected', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 120 }), (text) => {
        const once = withAskManagerToMark(text);
        expect(endsWithAskManagerToMark(once)).toBe(true);
        expect(withAskManagerToMark(once)).toBe(once);
        expect(once.trimEnd().endsWith(ASK_MANAGER_TO_MARK)).toBe(true);
        expect(once.startsWith(text.trimEnd())).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
