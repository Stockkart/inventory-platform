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

const shopInvitationsPath = (shopId: string) => `/shops/${shopId}/invitations`;
const shopUsersPath = (shopId: string) => `/shops/${shopId}/users/all`;
const acceptPath = (invitationId: string) =>
  `/invitations/${invitationId}/accept`;
const MY_INVITATIONS = '/users/invitations';

/** Invitation HTTP helpers for shared UI (avoids core/user ↔ ui cycle). */
export const invitationsClient = {
  sendInvitation: async (
    shopId: string,
    data: SendInvitationDto
  ): Promise<SendInvitationResponse> => {
    const response = await apiClient.post<ApiResponse<SendInvitationResponse>>(
      shopInvitationsPath(shopId),
      data
    );
    return response.data;
  },

  acceptInvitation: async (
    invitationId: string
  ): Promise<AcceptInvitationResponse> => {
    const response = await apiClient.post<ApiResponse<AcceptInvitationResponse>>(
      acceptPath(invitationId)
    );
    return response.data;
  },

  getMyInvitations: async (): Promise<Invitation[]> => {
    const response = await apiClient.get<ApiResponse<InvitationsResponse>>(
      MY_INVITATIONS
    );
    return response.data.data;
  },

  getShopInvitations: async (shopId: string): Promise<Invitation[]> => {
    const response = await apiClient.get<ApiResponse<InvitationsResponse>>(
      shopInvitationsPath(shopId)
    );
    return response.data.data;
  },

  getShopUsers: async (shopId: string): Promise<ShopUser[]> => {
    const response = await apiClient.get<ApiResponse<ShopUsersResponse>>(
      shopUsersPath(shopId)
    );
    return response.data.data;
  },
};
