import axios from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  CreateUploadTokenResponse,
  ValidateUploadTokenResponse,
  UploadStatusResponse,
  ParsedItemsResponse,
} from '@inventory-platform/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
// Mobile endpoints are public and don't use /api/v1 prefix
// Derive base URL from API_BASE_URL by removing /api/v1
const MOBILE_BASE_URL =
  import.meta.env.VITE_MOBILE_API_URL ||
  (API_BASE_URL.endsWith('/api/v1')
    ? API_BASE_URL.replace('/api/v1', '')
    : API_BASE_URL.replace(/\/api\/v1$/, '') || 'http://localhost:8080');

export const uploadApi = {
  /**
   * Creates an upload token for QR code pairing (Desktop - Authenticated)
   */
  createUploadToken: async (): Promise<CreateUploadTokenResponse> => {
    const response = await apiClient.post<
      ApiResponse<CreateUploadTokenResponse>
    >(API_ENDPOINTS.UPLOAD.CREATE_TOKEN);
    return response.data;
  },

  /**
   * Validates if an upload token is valid (Mobile - Public)
   * This is called by the frontend when QR code is scanned
   */
  validateUploadToken: async (
    token: string
  ): Promise<ValidateUploadTokenResponse> => {
    const response = await axios.get<ApiResponse<ValidateUploadTokenResponse>>(
      `${MOBILE_BASE_URL}${API_ENDPOINTS.UPLOAD.VALIDATE_TOKEN(token)}`
    );
    // API returns { success: true, data: { token, status, expiresAt, errorMessage } }
    return response.data.data;
  },

  /**
   * Uploads an invoice image from mobile device (Mobile - Public)
   * No authentication required
   */
  uploadImage: async (token: string, imageFile: File): Promise<string> => {
    return uploadApi.uploadImages(token, [imageFile]);
  },

  /** Upload one or more invoice photos from mobile (multi-page bill). */
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
      `${MOBILE_BASE_URL}${API_ENDPOINTS.UPLOAD.UPLOAD_IMAGE(token)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  /**
   * Gets the upload status (Desktop - Authenticated)
   * Poll this endpoint repeatedly to check if upload is complete
   */
  getUploadStatus: async (token: string): Promise<UploadStatusResponse> => {
    const response = await apiClient.get<ApiResponse<UploadStatusResponse>>(
      API_ENDPOINTS.UPLOAD.STATUS(token)
    );
    return response.data;
  },

  /**
   * Gets the parsed inventory items after upload is completed (Desktop - Authenticated)
   */
  getParsedItems: async (token: string): Promise<ParsedItemsResponse> => {
    const response = await apiClient.get<ApiResponse<ParsedItemsResponse>>(
      API_ENDPOINTS.UPLOAD.PARSED_ITEMS(token)
    );
    return response.data;
  },
};
