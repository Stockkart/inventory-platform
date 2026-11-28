// Auth types - Multi-shop support
export interface ShopMembership {
  shopId: string;
  shopName: string;
  role: string;
  relationship: 'OWNER' | 'INVITED' | null;
  joinedAt: string;
}

export interface User {
  userId: string;
  role: string;
  shopId: string | null;
  email?: string;
  name?: string;
  /** 10-digit Indian mobile when set at signup */
  phone?: string;
  active?: boolean;
  createdAt?: string;
  /** All shops the user can access (multi-shop support) */
  shops?: ShopMembership[];
}

export interface Shop {
  name?: string;
}

export interface LoginDto {
  idToken?: string; // For Google/Facebook login
  loginType?: 'google' | 'facebook'; // Required if idToken is provided
  email?: string; // Required if idToken is not provided
  password?: string; // Required if idToken is not provided
}

export interface SignupDto {
  idToken?: string; // For Google/Facebook signup
  signupType?: 'google' | 'facebook'; // Required if idToken is provided
  name?: string; // Required if idToken is not provided
  email?: string; // Required if idToken is not provided
  password?: string; // Required if idToken is not provided
  /** Required for email/password signup; 10 digits or +91… */
  phone?: string;
  shopId?: string;
  role?: string; // Default role if not provided
}

export interface AcceptInviteDto {
  inviteToken: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  shop: Shop;
}

export interface AcceptInviteResponse {
  userId: string;
  role: string;
  shopId: string;
  active: boolean;
}

export interface LogoutDto {
  userId: string;
  accessToken: string;
}

export interface LogoutResponse {
  deviceId: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

// Multi-shop API types
export interface SetActiveShopRequest {
  shopId: string;
}

export interface SetActiveShopResponse {
  activeShopId: string;
  message: string;
}

export interface UserShopsResponse {
  data: ShopMembership[];
}
