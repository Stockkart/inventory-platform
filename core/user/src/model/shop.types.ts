// Shop types
export interface Location {
  primaryAddress: string;
  secondaryAddress?: string;
  state: string;
  city: string;
  pin: string;
  country: string;
}

export type ShopType = 'RETAILER' | 'DISTRIBUTOR' | 'WHOLESALER';

export interface RegisterShopDto {
  name: string;
  businessId: string;
  location: Location;
  contactEmail: string;
  contactPhone: string;
  shopType?: ShopType;
  /** Required — must match an ACTIVE row in vertical_schemas (e.g. medical, sports). */
  verticalId: string;
  gstinNo?: string;
  fssai?: string;
  dlNo?: string;
  panNo?: string;
  sgst?: string;
  cgst?: string;
  tagline?: string;
}

export interface RegisterShopResponse {
  shopId: string;
  status: string;
}

export interface ShopDetailResponse {
  shopId: string;
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  gstinNo?: string | null;
  tagline?: string | null;
  location?: Location | null;
  /** Stored PAN, or derived from GSTIN: 10 chars from 3rd character (1-based). */
  panNo?: string | null;
  verticalId?: string | null;
  pluginVersion?: string | null;
  dlNo?: string | null;
  fssai?: string | null;
  shopType?: ShopType | null;
  sgst?: string | null;
  cgst?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface UpdateShopDto {
  tagline?: string | null;
  location?: Location | null;
}

export interface RequestJoinShopDto {
  ownerEmail: string;
  shopId: string;
  role: string;
  message?: string;
}

export interface OwnerShopSummary {
  shopId: string;
  shopName: string;
}

export interface OwnerShopsResponse {
  data: OwnerShopSummary[];
}

export interface RequestJoinShopResponse {
  requestId: string;
  shopId: string;
  shopName: string;
  status: string;
  message: string;
  createdAt: string;
}

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JoinRequest {
  requestId: string;
  shopId: string;
  shopName: string;
  userId: string;
  userEmail: string;
  userName: string;
  requestedRole: string;
  status: JoinRequestStatus;
  message: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface JoinRequestsResponse {
  data: JoinRequest[];
}

export interface ProcessJoinRequestDto {
  action: 'ACCEPT' | 'REJECT';
}

export interface ProcessJoinRequestResponse {
  requestId: string;
  shopId: string;
  shopName: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: string;
  reviewedAt: string;
  message: string;
}
