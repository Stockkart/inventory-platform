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

/** Returned once when an admin is added (and by older APIs on reset); the server does not keep it. */
export interface AdminPasswordIssued {
  admin: AdminAccount;
  temporaryPassword: string;
}

/**
 * Reset answer: the admin, who gets an email link to set a new password. Older APIs instead
 * returned a temporary password to pass on.
 */
export type AdminPasswordResetResult = AdminAccount | AdminPasswordIssued;

/** Body of the public reset-link request. */
export interface AdminResetPasswordRequest {
  token: string;
  newPassword: string;
}
