import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AuthResponse,
  ForgotPasswordDto,
  ForgotPasswordResponse,
  LoginDto,
  ResetPasswordDto,
  ResetPasswordResponse,
  SignupDto,
  AcceptInviteDto,
  AcceptInviteResponse,
  LogoutDto,
  LogoutResponse,
  User,
} from '../model/auth.types.js';
import { AUTH_ENDPOINTS } from './endpoints';

export const authApi = {
  login: async (credentials: LoginDto): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      AUTH_ENDPOINTS.LOGIN,
      credentials
    );
    if (response.success && response.data.accessToken) {
      apiClient.setToken(response.data.accessToken);
    }
    return response.data;
  },

  signup: async (data: SignupDto): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      AUTH_ENDPOINTS.SIGNUP,
      data
    );
    if (response.success && response.data.accessToken) {
      apiClient.setToken(response.data.accessToken);
    }
    return response.data;
  },

  acceptInvite: async (data: AcceptInviteDto): Promise<AcceptInviteResponse> => {
    const response = await apiClient.post<ApiResponse<AcceptInviteResponse>>(
      AUTH_ENDPOINTS.ACCEPT_INVITE,
      data
    );
    return response.data;
  },

  logout: async (data: LogoutDto): Promise<LogoutResponse> => {
    try {
      const response = await apiClient.post<ApiResponse<LogoutResponse>>(
        AUTH_ENDPOINTS.LOGOUT,
        data
      );
      return response.data;
    } finally {
      apiClient.setToken(null);
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(AUTH_ENDPOINTS.ME);
    return response.data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      AUTH_ENDPOINTS.REFRESH
    );
    if (response.success && response.data.accessToken) {
      apiClient.setToken(response.data.accessToken);
    }
    return response.data;
  },

  forgotPassword: async (
    data: ForgotPasswordDto
  ): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<ApiResponse<ForgotPasswordResponse>>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD,
      data
    );
    return response.data;
  },

  resetPassword: async (
    data: ResetPasswordDto
  ): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ApiResponse<ResetPasswordResponse>>(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      data
    );
    return response.data;
  },
};
