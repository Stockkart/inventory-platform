import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  ApproveJoinRequestRequest,
  BulkJoinRequest,
  BulkJoinResult,
  EmployeeResponse,
  JoinRequestDecision,
  JoinRequestDetail,
  JoinRequestListParams,
  JoinRequestsPageResponse,
  RejectJoinRequestRequest,
} from '@inventory-platform/hr/types';
import { HR_ENDPOINTS } from './endpoints';

function toQuery(params: JoinRequestListParams): Record<string, string> {
  const query: Record<string, string> = { status: params.status };
  if (params.page != null) query.page = String(params.page);
  if (params.size != null) query.size = String(params.size);
  return query;
}

/**
 * The manager's join-request inbox (`JoinRequestInboxController`, ADD_EDIT_EMPLOYEES on every
 * call) and "Request profile details" (`EmployeeController`). Every answer carries the snapshot a
 * worker submitted and nothing else (R4.2, R11.3); the photo is a URL the browser fetches with its
 * own session. The worker's own calls (`/hr/worker/**`) are not here: the browser is never the
 * Stockkart Team app.
 */
export const joinRequestsApi = {
  /** One status at a time, newest first; `pendingCount` feeds the tab label (R4.1–R4.2). */
  list: async (params: JoinRequestListParams): Promise<JoinRequestsPageResponse> => {
    const response = await apiClient.get<ApiResponse<JoinRequestsPageResponse>>(
      HR_ENDPOINTS.JOIN_REQUESTS,
      toQuery(params),
    );
    return response.data;
  },

  /** The row plus the possible match (same email or phone as a shop employee, R4.3). */
  detail: async (id: string): Promise<JoinRequestDetail> => {
    const response = await apiClient.get<ApiResponse<JoinRequestDetail>>(
      HR_ENDPOINTS.JOIN_REQUEST_BY_ID(id),
    );
    return response.data;
  },

  /**
   * `CREATE` makes the employee from the snapshot; `LINK` needs `employeeId` and links that record
   * (R4.4–R4.5, R4.8–R4.9). A refusal (8038–8040) leaves the request Pending; show its message.
   */
  approve: async (id: string, body: ApproveJoinRequestRequest): Promise<JoinRequestDecision> => {
    const response = await apiClient.post<ApiResponse<JoinRequestDecision>>(
      HR_ENDPOINTS.JOIN_REQUEST_DECISION(id, 'approve'),
      body,
    );
    return response.data;
  },

  /** Optional reason, 0–200 characters; blank means none (R4.7). */
  reject: async (id: string, body: RejectJoinRequestRequest): Promise<JoinRequestDecision> => {
    const response = await apiClient.post<ApiResponse<JoinRequestDecision>>(
      HR_ENDPOINTS.JOIN_REQUEST_DECISION(id, 'reject'),
      body,
    );
    return response.data;
  },

  /**
   * Approves each id as `CREATE`, ≤ 50 at a time; rows with a possible match are skipped and stay
   * Pending for a human choice (R4.6). `approved + skipped + failed` partition the selection.
   */
  bulkApprove: async (ids: string[]): Promise<BulkJoinResult> => {
    const body: BulkJoinRequest = { ids };
    const response = await apiClient.post<ApiResponse<BulkJoinResult>>(
      HR_ENDPOINTS.JOIN_REQUESTS_BULK('approve'),
      body,
    );
    return response.data;
  },

  /** Rejects each id with the one reason (already normalised by the caller), ≤ 50 at a time. */
  bulkReject: async (ids: string[], reason: string | null): Promise<BulkJoinResult> => {
    const body: BulkJoinRequest = { ids, reason };
    const response = await apiClient.post<ApiResponse<BulkJoinResult>>(
      HR_ENDPOINTS.JOIN_REQUESTS_BULK('reject'),
      body,
    );
    return response.data;
  },

  /**
   * "Request profile details" on an employee's page (R8.7): the linked worker is notified and
   * the employee comes back with `profileRequestedAt` set.
   */
  requestProfile: async (employeeId: string): Promise<EmployeeResponse> => {
    const response = await apiClient.post<ApiResponse<EmployeeResponse>>(
      HR_ENDPOINTS.EMPLOYEE_REQUEST_PROFILE(employeeId),
    );
    return response.data;
  },
};
