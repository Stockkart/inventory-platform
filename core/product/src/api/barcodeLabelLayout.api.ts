import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { BARCODE_LABEL_LAYOUT_ENDPOINTS } from './endpoints';
import { labelLayoutSession } from '../lib/labelLayoutSession';
import type {
  FieldCatalogResponse,
  LabelLayoutResponse,
  SaveLabelLayoutRequest,
} from '../model/labelLayout.types';

/**
 * Active-shop barcode label layout API.
 *
 * `get` and `save` return the shop's effective layout and refresh
 * `labelLayoutSession` so local (offline) prints use the latest layout (Req 7.9).
 * `defaults` and `fieldCatalog` are read-only lookups and do NOT touch the
 * session cache: the shop-type default is not the shop's layout (Req 4.1, 4.2).
 */
export const barcodeLabelLayoutApi = {
  get: async (): Promise<LabelLayoutResponse> => {
    const response = await apiClient.get<ApiResponse<LabelLayoutResponse>>(
      BARCODE_LABEL_LAYOUT_ENDPOINTS.BASE,
    );
    const layout = response.data;
    labelLayoutSession.set(layout);
    return layout;
  },
  save: async (data: SaveLabelLayoutRequest): Promise<LabelLayoutResponse> => {
    const response = await apiClient.put<ApiResponse<LabelLayoutResponse>>(
      BARCODE_LABEL_LAYOUT_ENDPOINTS.BASE,
      data,
    );
    const layout = response.data;
    labelLayoutSession.set(layout);
    return layout;
  },
  defaults: async (): Promise<LabelLayoutResponse> => {
    const response = await apiClient.get<ApiResponse<LabelLayoutResponse>>(
      BARCODE_LABEL_LAYOUT_ENDPOINTS.DEFAULTS,
    );
    return response.data;
  },
  /**
   * The effective layout an unsaved draft would print with (sticker size, sheet
   * grid, roll page box), resolved by the server. Nothing is saved and the
   * session cache is untouched.
   */
  preview: async (data: SaveLabelLayoutRequest): Promise<LabelLayoutResponse> => {
    const response = await apiClient.post<ApiResponse<LabelLayoutResponse>>(
      BARCODE_LABEL_LAYOUT_ENDPOINTS.PREVIEW,
      data,
    );
    return response.data;
  },
  fieldCatalog: async (): Promise<FieldCatalogResponse> => {
    const response = await apiClient.get<ApiResponse<FieldCatalogResponse>>(
      BARCODE_LABEL_LAYOUT_ENDPOINTS.FIELD_CATALOG,
    );
    return response.data;
  },
};
