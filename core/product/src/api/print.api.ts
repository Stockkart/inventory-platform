import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  CreatePrintJobRequest,
  PrintBridgeConnection,
  PrintBridgeObservation,
  PrintBridgeStatus,
  PrintJobPlan,
  PrintOutcomeResult,
  ReportPrintOutcomeRequest,
} from '@inventory-platform/product/types';
import { PRINT_ENDPOINTS } from './endpoints';

export const printApi = {
  /** Where the bridge listens on this PC and how long to wait on it. */
  bridgeConnection: async (): Promise<PrintBridgeConnection> => {
    const response = await apiClient.get<ApiResponse<PrintBridgeConnection>>(
      PRINT_ENDPOINTS.BRIDGE_CONNECTION,
    );
    return response.data;
  },

  /** Missing, outdated or connected, and where to download the bridge. */
  bridgeStatus: async (observation: PrintBridgeObservation): Promise<PrintBridgeStatus> => {
    const response = await apiClient.post<ApiResponse<PrintBridgeStatus>>(
      PRINT_ENDPOINTS.BRIDGE_STATUS,
      observation,
    );
    return response.data;
  },

  /** How to print one document: send to the bridge, download, or nothing (already printing). */
  createJob: async (request: CreatePrintJobRequest): Promise<PrintJobPlan> => {
    const response = await apiClient.post<ApiResponse<PrintJobPlan>>(PRINT_ENDPOINTS.JOBS, request);
    return response.data;
  },

  /** Report what the bridge did with a job, and get back what it means. */
  reportOutcome: async (
    printJobId: string,
    request: ReportPrintOutcomeRequest,
  ): Promise<PrintOutcomeResult> => {
    const response = await apiClient.post<ApiResponse<PrintOutcomeResult>>(
      PRINT_ENDPOINTS.OUTCOME(printJobId),
      request,
    );
    return response.data;
  },
};
