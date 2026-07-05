// Product types
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  quantity: number;
  reorderLevel?: number;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  quantity: number;
  reorderLevel?: number;
  description?: string;
}

export interface UpdateProductDto
  extends Partial<Omit<CreateProductDto, 'name' | 'sku'>> {
  name?: string;
  sku?: string;
}

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

// Order types
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  customerName?: string;
  createdAt: string;
}

export interface CreateOrderDto {
  items: Omit<OrderItem, 'total'>[];
  paymentMethod: string;
  customerName?: string;
}

