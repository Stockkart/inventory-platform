/** A StockKart operator. Separate from shop users; has no shop or shop role. */
export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  active: boolean;
  /** True until the admin replaces a bootstrap or temporary password. */
  mustChangePassword: boolean;
  createdByAdminId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  expiresAt: string;
  admin: AdminAccount;
}

export interface AdminChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AdminCreateRequest {
  email: string;
  name: string;
}

export interface AdminActiveChangeRequest {
  active: boolean;
  reason?: string;
}

export interface AdminReasonBody {
  reason?: string;
}

/** Returned once when an admin is added or reset; the server does not keep the password. */
export interface AdminPasswordIssued {
  admin: AdminAccount;
  temporaryPassword: string;
}
