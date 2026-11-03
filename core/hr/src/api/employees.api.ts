import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AddSalaryRevisionRequest,
  EmployeeListParams,
  EmployeeResponse,
  EmployeesPageResponse,
  ExitEmployeeRequest,
  LinkableLoginResponse,
  SaveEmployeeRequest,
} from '@inventory-platform/hr/types';
import { HR_ENDPOINTS } from './endpoints';

function toQuery(params: EmployeeListParams): Record<string, string> {
  const query: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    query[key] = String(value);
  });
  return query;
}

/** Employees and the login picker (`EmployeeController`). */
export const employeesApi = {
  list: async (params: EmployeeListParams = {}): Promise<EmployeesPageResponse> => {
    const response = await apiClient.get<ApiResponse<EmployeesPageResponse>>(
      HR_ENDPOINTS.EMPLOYEES,
      toQuery(params),
    );
    return response.data;
  },

  designations: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>(HR_ENDPOINTS.EMPLOYEE_DESIGNATIONS);
    return response.data ?? [];
  },

  get: async (id: string): Promise<EmployeeResponse> => {
    const response = await apiClient.get<ApiResponse<EmployeeResponse>>(
      HR_ENDPOINTS.EMPLOYEE_BY_ID(id),
    );
    return response.data;
  },

  create: async (body: SaveEmployeeRequest): Promise<EmployeeResponse> => {
    const response = await apiClient.post<ApiResponse<EmployeeResponse>>(
      HR_ENDPOINTS.EMPLOYEES,
      body,
    );
    return response.data;
  },

  /** Full update: needs `revision`, and sends link + payment details back (see the type doc). */
  update: async (id: string, body: SaveEmployeeRequest): Promise<EmployeeResponse> => {
    const response = await apiClient.put<ApiResponse<EmployeeResponse>>(
      HR_ENDPOINTS.EMPLOYEE_BY_ID(id),
      body,
    );
    return response.data;
  },

  addSalaryRevision: async (
    id: string,
    body: AddSalaryRevisionRequest,
  ): Promise<EmployeeResponse> => {
    const response = await apiClient.post<ApiResponse<EmployeeResponse>>(
      HR_ENDPOINTS.EMPLOYEE_SALARY_REVISIONS(id),
      body,
    );
    return response.data;
  },

  exit: async (id: string, body: ExitEmployeeRequest): Promise<EmployeeResponse> => {
    const response = await apiClient.post<ApiResponse<EmployeeResponse>>(
      HR_ENDPOINTS.EMPLOYEE_EXIT(id),
      body,
    );
    return response.data;
  },

  linkableLogins: async (): Promise<LinkableLoginResponse[]> => {
    const response = await apiClient.get<ApiResponse<LinkableLoginResponse[]>>(
      HR_ENDPOINTS.LINKABLE_LOGINS,
    );
    return response.data ?? [];
  },
};
