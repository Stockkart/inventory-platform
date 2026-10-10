import { describe, expect, it } from 'vitest';
import type { PrintJobPlan, PrintOutcomeResult } from '@inventory-platform/product/types';
import { PRINTED_MESSAGE, describePrint } from './printMessages';

const FILE = { filename: 'invoice-T001148.prn', content: 'TEXT' };

function plan(overrides: Partial<PrintJobPlan> = {}): PrintJobPlan {
  return {
    printJobId: 'job-1',
    action: 'BRIDGE',
    reason: null,
    bridgeState: 'CONNECTED',
    documentKind: 'INVOICE',
    bridgeRequest: {},
    download: FILE,
    poll: { intervalMs: 500, budgetMs: 5000 },
    ...overrides,
  };
}

function outcome(overrides: Partial<PrintOutcomeResult>): PrintOutcomeResult {
  return {
    outcome: 'PRINTED',
    shouldClose: true,
    retryable: false,
    downloadInstead: false,
    error: null,
    ...overrides,
  };
}

describe('describePrint', () => {
  it('words PRINTED as success with the exact wording the design spec requires', () => {
    expect(describePrint(plan(), outcome({}), 'invoice')).toEqual({
      channel: 'success',
      message: PRINTED_MESSAGE,
      shouldClose: true,
      download: null,
    });
  });

  it("keeps a printer fault on screen when the backend says so, with the printer's error", () => {
    const message = describePrint(
      plan(),
      outcome({ outcome: 'FAILED_PRINTER', shouldClose: false, error: 'Out of paper' }),
      'invoice',
    );
    expect(message.channel).toBe('error');
    expect(message.message).toContain('Out of paper');
    expect(message.shouldClose).toBe(false);
  });

  it('hands over the printer file only when the backend says to download instead', () => {
    const message = describePrint(
      plan(),
      outcome({ outcome: 'BRIDGE_UNREACHABLE', downloadInstead: true }),
      'invoice',
    );
    expect(message.channel).toBe('error');
    expect(message.download).toEqual(FILE);
  });

  it('offers no file for a refusal that may already have printed', () => {
    const message = describePrint(
      plan(),
      outcome({ outcome: 'BRIDGE_REJECTED', shouldClose: false, error: 'timeout' }),
      'invoice',
    );
    expect(message.download).toBeNull();
    expect(message.message).toContain('may already have printed');
  });

  it('words ALREADY_SENT and STILL_QUEUED as information, naming the document', () => {
    expect(describePrint(plan(), outcome({ outcome: 'ALREADY_SENT' }), 'estimate').message).toBe(
      'This estimate was already sent to the printer moments ago.',
    );
    expect(describePrint(plan(), outcome({ outcome: 'STILL_QUEUED' }), 'invoice').channel).toBe(
      'info',
    );
  });

  it('downloads when the backend chose DOWNLOAD', () => {
    const message = describePrint(
      plan({ action: 'DOWNLOAD', reason: 'BRIDGE_UNAVAILABLE', bridgeRequest: null, poll: null }),
      null,
      'invoice',
    );
    expect(message.download).toEqual(FILE);
    expect(message.shouldClose).toBe(true);
  });

  it('sends nothing and downloads nothing when the document is already printing', () => {
    const message = describePrint(
      plan({ action: 'IN_PROGRESS', reason: 'PRINT_IN_PROGRESS', download: null }),
      null,
      'credit note',
    );
    expect(message).toEqual({
      channel: 'info',
      message: 'This credit note is already on its way to the printer.',
      shouldClose: true,
      download: null,
    });
  });
});
