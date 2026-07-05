import axios from 'axios';
import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type { CreateUploadTokenResponse, ValidateUploadTokenResponse, UploadStatusResponse, ParsedItemsResponse } from '@inventory-platform/product/types';
import { UPLOAD_ENDPOINTS } from './endpoints';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const MOBILE_BASE_URL =
  import.meta.env.VITE_MOBILE_API_URL ||
  (API_BASE_URL.endsWith('/api/v1')
    ? API_BASE_URL.replace('/api/v1', '')
    : API_BASE_URL.replace(/\/api\/v1$/, '') || 'http://localhost:8080');

export const uploadApi = {
  createUploadToken: async (): Promise<CreateUploadTokenResponse> => {
    const response = await apiClient.post<
      ApiResponse<CreateUploadTokenResponse>
    >(UPLOAD_ENDPOINTS.CREATE_TOKEN);
    return response.data;
  },

  validateUploadToken: async (
    token: string
  ): Promise<ValidateUploadTokenResponse> => {
    const response = await axios.get<ApiResponse<ValidateUploadTokenResponse>>(
      `${MOBILE_BASE_URL}${UPLOAD_ENDPOINTS.VALIDATE_TOKEN(token)}`
    );
    return response.data.data;
  },

  uploadImage: async (token: string, imageFile: File): Promise<string> => {
    return uploadApi.uploadImages(token, [imageFile]);
  },

  uploadImages: async (token: string, imageFiles: File[]): Promise<string> => {
    if (!imageFiles.length) {
      throw new Error('At least one image is required');
    }
    const formData = new FormData();
    if (imageFiles.length === 1) {
      formData.append('image', imageFiles[0]);
    } else {
      for (const file of imageFiles) {
        formData.append('images', file);
      }
    }

    const response = await axios.post<ApiResponse<string>>(
      `${MOBILE_BASE_URL}${UPLOAD_ENDPOINTS.UPLOAD_IMAGE(token)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  getUploadStatus: async (token: string): Promise<UploadStatusResponse> => {
    const response = await apiClient.get<ApiResponse<UploadStatusResponse>>(
      UPLOAD_ENDPOINTS.STATUS(token)
    );
    return response.data;
  },

  getParsedItems: async (token: string): Promise<ParsedItemsResponse> => {
    const response = await apiClient.get<ApiResponse<ParsedItemsResponse>>(
      UPLOAD_ENDPOINTS.PARSED_ITEMS(token)
    );
    return response.data;
  },
};
