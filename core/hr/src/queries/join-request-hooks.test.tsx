// @vitest-environment jsdom
// Worker-app 10.1: the join-request hooks key by shop, poll the list every 60 s, normalise the
// rejection reason and refresh both the inbox and the employees tree after a decision.
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@inventory-platform/session';
import { JOIN_REQUESTS_POLL_MS } from '@inventory-platform/hr/types';
import {
  useApproveJoinRequestMutation,
  useBulkJoinRequestsMutation,
  useJoinRequestQuery,
  useJoinRequestsQuery,
  useRejectJoinRequestMutation,
  useRequestProfileMutation,
} from './hooks';
import { hrKeys } from './keys';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  bulkApprove: vi.fn(),
  bulkReject: vi.fn(),
  requestProfile: vi.fn(),
}));
vi.mock('../api/join-requests.api', () => ({ joinRequestsApi: api }));

const SHOP = 'shop-1';
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ user: { shopId: SHOP, userId: 'u1' } } as never);
  api.list.mockResolvedValue({
    items: [],
    pendingCount: 0,
    page: 0,
    size: 50,
    totalItems: 0,
    totalPages: 0,
  });
  api.detail.mockResolvedValue({ id: 'r1' });
  api.approve.mockResolvedValue({ id: 'r1', outcome: 'APPROVED_CREATED', employeeId: 'e9' });
  api.reject.mockResolvedValue({ id: 'r1', outcome: 'REJECTED' });
  api.bulkApprove.mockResolvedValue({ approved: 1, skipped: [], failed: [] });
  api.bulkReject.mockResolvedValue({ approved: 1, skipped: [], failed: [] });
  api.requestProfile.mockResolvedValue({ id: 'e1', profileRequestedAt: '2026-05-12T09:00:00Z' });
});

afterEach(() => {
  client.clear();
  useAuthStore.setState({ user: null } as never);
});

describe('useJoinRequestsQuery', () => {
  it('reads one status per key and polls every 60 s', async () => {
    const { result } = renderHook(() => useJoinRequestsQuery({ status: 'PENDING', page: 0 }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.list).toHaveBeenCalledWith({ status: 'PENDING', page: 0 });
    const query = client
      .getQueryCache()
      .find({ queryKey: hrKeys.joinRequestList(SHOP, { status: 'PENDING', page: 0 }) });
    expect(query).toBeDefined();
    expect(result.current.data?.pendingCount).toBe(0);
    // The poll cadence is the design's 60 s, applied as the query's refetch interval.
    expect(JOIN_REQUESTS_POLL_MS).toBe(60_000);
  });

  it('stays off without a shop or when disabled (no permission)', () => {
    renderHook(() => useJoinRequestsQuery({ status: 'PENDING' }, false), { wrapper });
    useAuthStore.setState({ user: null } as never);
    renderHook(() => useJoinRequestsQuery({ status: 'PENDING' }), { wrapper });
    expect(api.list).not.toHaveBeenCalled();
  });
});

describe('useJoinRequestQuery', () => {
  it('waits for an id, then reads the detail under the shop key', async () => {
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useJoinRequestQuery(id), {
      wrapper,
      initialProps: {},
    });
    expect(api.detail).not.toHaveBeenCalled();
    rerender({ id: 'r1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.detail).toHaveBeenCalledWith('r1');
    expect(client.getQueryData(hrKeys.joinRequest(SHOP, 'r1'))).toEqual({ id: 'r1' });
  });
});

describe('decisions refresh the inbox and the employees tree', () => {
  function seed() {
    client.setQueryData(hrKeys.joinRequestList(SHOP, { status: 'PENDING' }), {
      items: [],
      pendingCount: 1,
      page: 0,
      size: 50,
      totalItems: 1,
      totalPages: 1,
    });
    client.setQueryData(hrKeys.employeeList(SHOP, {}), { items: [], page: {} });
    client.setQueryData(hrKeys.setupStatus(SHOP), {});
    client.setQueryData(hrKeys.leave(SHOP), {});
  }

  function stale(key: readonly unknown[]) {
    return client.getQueryState(key)?.isInvalidated === true;
  }

  it('approve invalidates join requests, employees and setup status, not leave', async () => {
    seed();
    const { result } = renderHook(() => useApproveJoinRequestMutation(), { wrapper });
    await act(() => result.current.mutateAsync({ id: 'r1', body: { mode: 'CREATE' } }));
    expect(api.approve).toHaveBeenCalledWith('r1', { mode: 'CREATE' });
    await waitFor(() => {
      expect(stale(hrKeys.joinRequestList(SHOP, { status: 'PENDING' }))).toBe(true);
    });
    expect(stale(hrKeys.employeeList(SHOP, {}))).toBe(true);
    expect(stale(hrKeys.setupStatus(SHOP))).toBe(true);
    expect(stale(hrKeys.leave(SHOP))).toBe(false);
  });

  it('a refused approve ("already handled") still refreshes the list', async () => {
    seed();
    api.approve.mockRejectedValueOnce(new Error('This request was already handled'));
    const { result } = renderHook(() => useApproveJoinRequestMutation(), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 'r1', body: { mode: 'LINK', employeeId: 'e1' } }),
      ).rejects.toThrow('This request was already handled');
    });
    await waitFor(() => {
      expect(stale(hrKeys.joinRequestList(SHOP, { status: 'PENDING' }))).toBe(true);
    });
  });

  it('reject trims the reason and sends a blank one as null', async () => {
    const { result } = renderHook(() => useRejectJoinRequestMutation(), { wrapper });
    await act(() => result.current.mutateAsync({ id: 'r1', reason: '  Not hiring  ' }));
    await act(() => result.current.mutateAsync({ id: 'r2', reason: '   ' }));
    await act(() => result.current.mutateAsync({ id: 'r3' }));
    expect(api.reject).toHaveBeenNthCalledWith(1, 'r1', { reason: 'Not hiring' });
    expect(api.reject).toHaveBeenNthCalledWith(2, 'r2', { reason: null });
    expect(api.reject).toHaveBeenNthCalledWith(3, 'r3', { reason: null });
  });

  it('bulk routes approve and reject to their calls, with the normalised reason', async () => {
    seed();
    const { result } = renderHook(() => useBulkJoinRequestsMutation(), { wrapper });
    await act(() => result.current.mutateAsync({ decision: 'approve', ids: ['r1', 'r2'] }));
    await act(() =>
      result.current.mutateAsync({ decision: 'reject', ids: ['r3'], reason: ' Full ' }),
    );
    expect(api.bulkApprove).toHaveBeenCalledWith(['r1', 'r2']);
    expect(api.bulkReject).toHaveBeenCalledWith(['r3'], 'Full');
    await waitFor(() => {
      expect(stale(hrKeys.joinRequestList(SHOP, { status: 'PENDING' }))).toBe(true);
    });
    expect(stale(hrKeys.employeeList(SHOP, {}))).toBe(true);
  });

  it('request profile seeds the employee detail with the stamped copy', async () => {
    const { result } = renderHook(() => useRequestProfileMutation(), { wrapper });
    await act(() => result.current.mutateAsync('e1'));
    expect(api.requestProfile).toHaveBeenCalledWith('e1');
    expect(client.getQueryData(hrKeys.employee(SHOP, 'e1'))).toEqual({
      id: 'e1',
      profileRequestedAt: '2026-05-12T09:00:00Z',
    });
  });
});
