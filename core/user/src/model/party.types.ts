// Invitation types
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Invitation {
  invitationId: string;
  shopId: string;
  shopName: string;
  inviterUserId: string;
  inviterName: string;
  inviteeUserId?: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
}

export interface SendInvitationDto {
  inviteeEmail: string;
  role: string;
}

export interface SendInvitationResponse {
  invitationId: string;
  shopId: string;
  inviteeEmail: string;
  role: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  message: string;
}

export interface AcceptInvitationResponse {
  invitationId: string;
  shopId: string;
  shopName: string;
  userId: string;
  role: string;
  acceptedAt: string;
  message: string;
}

export interface InvitationsResponse {
  data: Invitation[];
}

// Shop User types
export type UserRelationship = 'OWNER' | 'INVITED' | null;

export interface ShopUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  relationship: UserRelationship;
  active: boolean;
  joinedAt: string | null;
}

export interface ShopUsersResponse {
  data: ShopUser[];
}

// User Role type
export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

/** Minimal user info when searching to link vendor/customer to a registered user */
export interface LinkableUser {
  userId: string;
  email: string;
  name: string;
}

// Vendor types
export type VendorBusinessType =
  | 'WHOLESALE'
  | 'RETAIL'
  | 'MANUFACTURER'
  | 'DISTRIBUTOR';

export interface Vendor {
  vendorId: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  companyName: string;
  businessType: VendorBusinessType;
  gstinUin?: string | null;
  /** Optional. Set when vendor is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorDto {
  name: string;
  contactEmail?: string;
  contactPhone: string;
  address?: string;
  businessType: VendorBusinessType;
  gstinUin?: string;
  /** Optional. Links vendor to a registered user account. */
  userId?: string | null;
}

export interface VendorResponse {
  vendorId: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  companyName: string;
  businessType: VendorBusinessType;
  gstinUin?: string | null;
  /** Optional. Set when vendor is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Customer types
export interface Customer {
  customerId: string;
  name: string;
  phone: string;
  address: string | null;
  email: string | null;
  gstin?: string | null;
  dlNo?: string | null;
  pan?: string | null;
  /** Optional. Set when customer is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerResponse {
  customerId: string;
  name: string;
  phone: string;
  address: string | null;
  email: string | null;
  gstin?: string | null;
  dlNo?: string | null;
  pan?: string | null;
  /** PAN derived from GSTIN: 10 chars from 3rd character (1-based). */
  panNo?: string | null;
  /** Optional. Set when customer is linked to a registered user. */
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  data: CustomerResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  dlNo?: string;
  pan?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  dlNo?: string;
  pan?: string;
}

export interface VendorListResponse {
  data: VendorResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UpdateVendorDto {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  companyName?: string;
  businessType?: string;
  gstinUin?: string;
}

