// Worker-app 10.1: every join-request inbox call goes to the backend path it mirrors
// (`JoinRequestInboxController`, `EmployeeController.requestProfile`) with the body the server expects.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { joinRequestsApi } from './join-requests.api';

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@inventory-platform/api-client', () => ({ apiClient: client }));

beforeEach(() => {
  vi.clearAllMocks();
  client.get.mockResolvedValue({ data: {} });
  client.post.mockResolvedValue({ data: {} });
});

describe('join-request inbox calls', () => {
  it('lists one status at a time and sends only the params given', async () => {
    client.get.mockResolvedValueOnce({
      data: { items: [], pendingCount: 3, page: 0, size: 50, totalItems: 3, totalPages: 1 },
    });
    const page = await joinRequestsApi.list({ status: 'PENDING' });
    await joinRequestsApi.list({ status: 'REJECTED', page: 2, size: 50 });
    expect(client.get).toHaveBeenNthCalledWith(1, '/hr/join-requests', { status: 'PENDING' });
    expect(client.get).toHaveBeenNthCalledWith(2, '/hr/join-requests', {
      status: 'REJECTED',
      page: '2',
      size: '50',
    });
    expect(page.pendingCount).toBe(3);
    // the paging fields are top-level numbers, as the Java DTO sends them
    expect(page.page).toBe(0);
    expect(page.size).toBe(50);
    expect(page.totalItems).toBe(3);
    expect(page.totalPages).toBe(1);
  });

  it('reads one request by id, URL-encoded', async () => {
    await joinRequestsApi.detail('r 1');
    expect(client.get).toHaveBeenCalledWith('/hr/join-requests/r%201');
  });

  it('posts approve and reject with their bodies', async () => {
    await joinRequestsApi.approve('r1', { mode: 'CREATE' });
    await joinRequestsApi.approve('r2', { mode: 'LINK', employeeId: 'e1' });
    await joinRequestsApi.reject('r3', { reason: 'Not hiring' });
    await joinRequestsApi.reject('r4', { reason: null });
    expect(client.post).toHaveBeenNthCalledWith(1, '/hr/join-requests/r1/approve', {
      mode: 'CREATE',
    });
    expect(client.post).toHaveBeenNthCalledWith(2, '/hr/join-requests/r2/approve', {
      mode: 'LINK',
      employeeId: 'e1',
    });
    expect(client.post).toHaveBeenNthCalledWith(3, '/hr/join-requests/r3/reject', {
      reason: 'Not hiring',
    });
    expect(client.post).toHaveBeenNthCalledWith(4, '/hr/join-requests/r4/reject', { reason: null });
  });

  it('posts bulk approve with ids only and bulk reject with ids and the one reason', async () => {
    client.post.mockResolvedValueOnce({
      data: { approved: 1, skipped: [{ id: 'r2', reason: 'POSSIBLE_MATCH' }], failed: [] },
    });
    const result = await joinRequestsApi.bulkApprove(['r1', 'r2']);
    await joinRequestsApi.bulkReject(['r3'], null);
    await joinRequestsApi.bulkReject(['r4', 'r5'], 'Shop is full');
    expect(client.post).toHaveBeenNthCalledWith(1, '/hr/join-requests/bulk/approve', {
      ids: ['r1', 'r2'],
    });
    expect(client.post).toHaveBeenNthCalledWith(2, '/hr/join-requests/bulk/reject', {
      ids: ['r3'],
      reason: null,
    });
    expect(client.post).toHaveBeenNthCalledWith(3, '/hr/join-requests/bulk/reject', {
      ids: ['r4', 'r5'],
      reason: 'Shop is full',
    });
    expect(result.approved + result.skipped.length + result.failed.length).toBe(2);
  });

  it('asks for profile details on the employee, not the request', async () => {
    client.post.mockResolvedValueOnce({
      data: { id: 'e1', profileRequestedAt: '2026-05-12T09:00:00Z' },
    });
    const employee = await joinRequestsApi.requestProfile('e1');
    expect(client.post).toHaveBeenCalledWith('/hr/employees/e1/request-profile');
    expect(employee.profileRequestedAt).toBe('2026-05-12T09:00:00Z');
  });
});
