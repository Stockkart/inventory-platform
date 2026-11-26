import { describe, expect, it } from 'vitest';
import type { HrNotificationResponse } from './me.types';
import type { EmployeeResponse } from './employee.types';
import {
  BULK_JOIN_MAX,
  JOIN_REQUESTS_POLL_MS,
  JOIN_REQUEST_PAGE_MAX,
  REJECT_REASON_MAX,
  normaliseRejectReason,
  type JoinRequestListParams,
} from './join-request.types';

describe('join request UI constants (worker-app R4.1, R4.6, R4.7, R11.3)', () => {
  it('mirror the server caps and the 60 s refresh of the tab count', () => {
    expect(JOIN_REQUEST_PAGE_MAX).toBe(200);
    expect(BULK_JOIN_MAX).toBe(50);
    expect(REJECT_REASON_MAX).toBe(200);
    expect(JOIN_REQUESTS_POLL_MS).toBe(60_000);
  });

  it('list params offer the two tab filters only', () => {
    const pending: JoinRequestListParams = { status: 'PENDING' };
    const rejected: JoinRequestListParams = { status: 'REJECTED', page: 1, size: 200 };
    expect([pending.status, rejected.status]).toEqual(['PENDING', 'REJECTED']);
  });
});

describe('normaliseRejectReason (R4.7, D13)', () => {
  it('trims, and treats blank or whitespace-only as no reason', () => {
    expect(normaliseRejectReason('  Not hiring now ')).toBe('Not hiring now');
    expect(normaliseRejectReason('')).toBeNull();
    expect(normaliseRejectReason('   \n\t ')).toBeNull();
    expect(normaliseRejectReason(null)).toBeNull();
    expect(normaliseRejectReason(undefined)).toBeNull();
  });

  it('leaves a long reason to the server, which refuses it with its own message', () => {
    const long = 'x'.repeat(REJECT_REASON_MAX + 1);
    expect(normaliseRejectReason(long)).toBe(long);
  });
});

describe('types extended for the Stockkart Team app', () => {
  it('an inbox row may carry a joinRequestId and one of the six new types', () => {
    const row: HrNotificationResponse = {
      id: 'n1',
      type: 'JOIN_REQUEST_RECEIVED',
      joinRequestId: 'r1',
      text: 'Priya asked to join',
      createdAt: '2026-05-12T09:00:00Z',
      read: false,
    };
    expect(row.joinRequestId).toBe('r1');
    expect(row.leaveRequestId).toBeUndefined();
  });

  it('an employee may carry profileRequestedAt (R8.7)', () => {
    const employee: EmployeeResponse = {
      id: 'e1',
      code: 'EMP-015',
      name: 'Priya',
      status: 'ACTIVE',
      payHidden: true,
      profileRequestedAt: '2026-05-12T09:00:00Z',
    };
    expect(employee.profileRequestedAt).toBe('2026-05-12T09:00:00Z');
  });
});
