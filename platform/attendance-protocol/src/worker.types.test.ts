import { describe, expect, it } from 'vitest';
import {
  MODULE_KEYS,
  WORKER_NOTIFICATION_TYPES,
  isModuleKey,
  type BulkJoinResult,
  type HrNotificationType,
  type JoinOutcome,
  type JoinRequestDetail,
  type JoinRequestRow,
  type JoinRequestSelfResponse,
  type ModuleKey,
  type WorkerJoinStatus,
  type WorkerProfileResponse,
  type WorkerState,
  type WorkerStateResponse,
} from './worker.types.js';

describe('worker wire types', () => {
  it('string-literal unions carry the backend constants', () => {
    const statuses: WorkerJoinStatus[] = [
      'PENDING',
      'APPROVING',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
    ];
    const outcomes: JoinOutcome[] = [
      'APPROVED_CREATED',
      'APPROVED_LINKED',
      'REJECTED',
      'WITHDRAWN',
    ];
    const states: WorkerState[] = ['NO_SHOP', 'PENDING', 'ACTIVE', 'STAFF_NO_EMPLOYEE'];
    expect(statuses).toHaveLength(5);
    expect(outcomes).toHaveLength(4);
    expect(states).toHaveLength(4);
  });

  it('knows exactly the three modules of this version and the four new notification types', () => {
    expect(MODULE_KEYS).toEqual(['ATTENDANCE', 'HISTORY', 'PROFILE']);
    expect(isModuleKey('ATTENDANCE')).toBe(true);
    expect(isModuleKey('PAYSLIPS')).toBe(false);
    expect(isModuleKey('')).toBe(false);
    expect(WORKER_NOTIFICATION_TYPES).toEqual([
      'JOIN_REQUEST_RECEIVED',
      'JOIN_REQUEST_APPROVED',
      'JOIN_REQUEST_REJECTED',
      'PROFILE_REQUESTED',
    ]);
  });

  it('a PENDING state carries the one open request as {id, shopName, status, requestedAt} (R3.10)', () => {
    const request: JoinRequestSelfResponse = {
      id: 'r1',
      shopName: 'Sri Ganesh Stores',
      status: 'PENDING',
      requestedAt: '2025-05-12T08:00:00Z',
    };
    const state: WorkerStateResponse = {
      state: 'PENDING',
      account: { userId: 'u1', name: 'Priya', email: 'p@x.in', role: 'WORKER' },
      request,
      modules: [],
      notifications: { unread: 0, top: [] },
      serverTime: '2025-05-12T09:00:01Z',
    };
    expect(Object.keys(state.request ?? {}).sort()).toEqual(
      ['id', 'shopName', 'status', 'requestedAt'].sort(),
    );
    expect(state.request).not.toHaveProperty('kind');
  });

  it('a NO_SHOP state carries no shop section and an empty module list (R6.1, R6.4)', () => {
    const state: WorkerStateResponse = {
      state: 'NO_SHOP',
      account: {
        userId: 'u1',
        name: 'Priya',
        email: 'p@x.in',
        phone: '9876543210',
        role: 'WORKER',
      },
      lastOutcome: {
        id: 'r1',
        status: 'REJECTED',
        shopName: 'Sri Ganesh Stores',
        reason: 'Not hiring',
        decidedAt: '2025-05-12T09:00:00Z',
      },
      modules: [],
      notifications: { unread: 0, top: [] },
      serverTime: '2025-05-12T09:00:01Z',
    };
    expect(state.shop).toBeUndefined();
    expect(state.modules).toEqual([]);
  });

  it('an ACTIVE state has the module list as sent by the server, unknown keys included (R6.6)', () => {
    const state: WorkerStateResponse = {
      state: 'ACTIVE',
      account: { userId: 'u1', name: 'Priya', email: 'p@x.in', role: 'WORKER' },
      shop: { shopId: 's1', shopName: 'Sri Ganesh Stores' },
      employee: {
        employeeId: 'e1',
        code: 'EMP-015',
        name: 'Priya',
        joinDate: '2025-05-12',
        status: 'ACTIVE',
      },
      modules: ['ATTENDANCE', 'HISTORY', 'PROFILE', 'PAYSLIPS'],
      pairing: { state: 'PAIRED', pairingId: 'p1' },
      today: { date: '2025-05-12', in: '09:12', nextDirection: 'OUT' },
      notifications: {
        unread: 1,
        top: [
          {
            id: 'n1',
            type: 'JOIN_REQUEST_APPROVED',
            text: 'Sri Ganesh Stores accepted you',
            createdAt: '2025-05-12T08:00:00Z',
            read: false,
            joinRequestId: 'r1',
          },
        ],
      },
      serverTime: '2025-05-12T09:13:00Z',
    };
    expect(state.modules.filter(isModuleKey)).toHaveLength(3);
    expect(state.modules.filter((k) => !isModuleKey(k))).toEqual(['PAYSLIPS']);
  });

  it('an inbox row carries the snapshot fields and nothing more (R4.2, R11.3)', () => {
    const row: JoinRequestRow = {
      id: 'r1',
      name: 'Ravi',
      phone: '9876543210',
      email: 'ravi@x.in',
      photoUrl: '/api/v1/users/u2/photo',
      requestedAt: '2025-05-12T08:00:00Z',
      status: 'PENDING',
      hasPossibleMatch: true,
    };
    // The design's `JoinRequestRow` list, and nothing else: no kind, no paired employee (D11).
    expect(Object.keys(row).sort()).toEqual(
      [
        'id',
        'name',
        'phone',
        'email',
        'photoUrl',
        'requestedAt',
        'status',
        'hasPossibleMatch',
      ].sort(),
    );
    expect(row).not.toHaveProperty('kind');
    expect(row).not.toHaveProperty('pairedEmployee');
    const detail: JoinRequestDetail = {
      ...row,
      possibleMatch: {
        employeeId: 'e2',
        code: 'EMP-014',
        name: 'Ravi',
        status: 'ACTIVE',
        linked: false,
      },
    };
    expect(detail.possibleMatch?.linked).toBe(false);
  });

  it('a bulk result partitions the selection into approved, skipped and failed (R4.6)', () => {
    const result: BulkJoinResult = {
      approved: 6,
      skipped: [
        { id: 'r7', reason: 'POSSIBLE_MATCH' },
        { id: 'r8', reason: 'POSSIBLE_MATCH' },
      ],
      failed: [{ id: 'r9', message: 'This request was already handled' }],
    };
    expect(result.approved + result.skipped.length + result.failed.length).toBe(9);
  });

  it('the profile response has no pay, bank or UPI field (R11.2)', () => {
    const profile: WorkerProfileResponse = {
      name: 'Priya',
      phone: '9876543210',
      email: 'p@x.in',
      shopName: 'Sri Ganesh Stores',
      employeeCode: 'EMP-015',
      joinDate: '2025-05-12',
      profileRequested: false,
      pairingState: 'NOT_PAIRED',
    };
    for (const banned of [
      'salaryRevisions',
      'bankAccountNumber',
      'ifsc',
      'upiId',
      'paymentMethod',
    ]) {
      expect(profile).not.toHaveProperty(banned);
    }
  });
});

/**
 * Task 9.2 — `ModuleKey` is the contract the app's module registry and its strings file are keyed
 * by. This package cannot import the app (`type:platform` must not depend on `type:app`), so "every
 * `ModuleKey` has a label id in `strings.en.ts`" is asserted in
 * `apps/attendance/src/modules/registry.test.ts`; here we pin what that test relies on: the
 * runtime list is exactly the type, in the server's order, and `isModuleKey` is that list.
 */
describe('ModuleKey: the runtime list is the type (R6.4, R6.6, DD10)', () => {
  it('MODULE_KEYS names every member of the ModuleKey union once, in WorkerModules.forShop order', () => {
    // Adding or removing a member of `ModuleKey` without touching `MODULE_KEYS` fails to compile here.
    const everyMember: Record<ModuleKey, true> = { ATTENDANCE: true, HISTORY: true, PROFILE: true };
    expect([...MODULE_KEYS]).toEqual(Object.keys(everyMember));
    expect(new Set(MODULE_KEYS).size).toBe(MODULE_KEYS.length);
    expect(MODULE_KEYS).toEqual(['ATTENDANCE', 'HISTORY', 'PROFILE']);
  });

  it('isModuleKey accepts exactly MODULE_KEYS: not a lower-case key, a prototype name, or a key of a later version', () => {
    for (const key of MODULE_KEYS) {
      expect(isModuleKey(key)).toBe(true);
      expect(isModuleKey(key.toLowerCase())).toBe(false);
      expect(isModuleKey(` ${key}`)).toBe(false);
    }
    for (const notAKey of ['toString', 'constructor', '__proto__', 'length', 'PAYSLIPS', 'LEAVE']) {
      expect(isModuleKey(notAKey)).toBe(false);
    }
  });

  it('WORKER_NOTIFICATION_TYPES are the four new HrNotificationType members, none of the leave types', () => {
    const leaveTypes: HrNotificationType[] = [
      'LEAVE_REQUESTED',
      'LEAVE_APPROVED',
      'LEAVE_REJECTED',
    ];
    expect(new Set(WORKER_NOTIFICATION_TYPES).size).toBe(4);
    for (const type of leaveTypes) {
      expect(WORKER_NOTIFICATION_TYPES).not.toContain(type);
    }
    // Adding or removing a member of `HrNotificationType` without touching this list fails here.
    const everyMember: Record<HrNotificationType, true> = {
      LEAVE_REQUESTED: true,
      LEAVE_APPROVED: true,
      LEAVE_REJECTED: true,
      JOIN_REQUEST_RECEIVED: true,
      JOIN_REQUEST_APPROVED: true,
      JOIN_REQUEST_REJECTED: true,
      PROFILE_REQUESTED: true,
    };
    expect(Object.keys(everyMember)).toHaveLength(7);
    expect([...leaveTypes, ...WORKER_NOTIFICATION_TYPES].sort()).toEqual(
      Object.keys(everyMember).sort(),
    );
    // The LINK_REQUEST_* types went with the legacy link requests (D11, R10.2).
    const all = Object.keys(everyMember) as string[];
    expect(all).not.toContain('LINK_REQUEST_APPROVED');
    expect(all).not.toContain('LINK_REQUEST_REJECTED');
  });
});
