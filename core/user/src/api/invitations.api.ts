import { apiClient } from '@inventory-platform/api-client';
import type {
  AcceptInvitationResponse,
  ApiResponse,
  Invitation,
  InvitationsResponse,
  SendInvitationDto,
  SendInvitationResponse,
  ShopUser,
  ShopUsersResponse,
} from '@inventory-platform/types';
import { INVITATION_ENDPOINTS, SHOP_ACCESS_ENDPOINTS } from './endpoints';

export const invitationsApi = {
  sendInvitation: async (
    shopId: string,
    data: SendInvitationDto
  ): Promise<SendInvitationResponse> => {
    const response = await apiClient.post<ApiResponse<SendInvitationResponse>>(
      SHOP_ACCESS_ENDPOINTS.INVITATIONS(shopId),
      data
    );
    return response.data;
  },

  acceptInvitation: async (
    invitationId: string
  ): Promise<AcceptInvitationResponse> => {
    const response = await apiClient.post<ApiResponse<AcceptInvitationResponse>>(
      INVITATION_ENDPOINTS.ACCEPT(invitationId)
    );
    return response.data;
  },

  getMyInvitations: async (): Promise<Invitation[]> => {
    const response = await apiClient.get<ApiResponse<InvitationsResponse>>(
      INVITATION_ENDPOINTS.MY_INVITATIONS
    );
    return response.data.data;
  },

  getShopInvitations: async (shopId: string): Promise<Invitation[]> => {
    const response = await apiClient.get<ApiResponse<InvitationsResponse>>(
      SHOP_ACCESS_ENDPOINTS.INVITATIONS(shopId)
    );
    return response.data.data;
  },

  getShopUsers: async (shopId: string): Promise<ShopUser[]> => {
    const response = await apiClient.get<ApiResponse<ShopUsersResponse>>(
      SHOP_ACCESS_ENDPOINTS.USERS_ALL(shopId)
    );
    return response.data.data;
  },
};
