import type { LoginDto, SignupDto, User, Shop } from './auth.types.js';

export interface AuthState {
  user: User | null;
  shop: Shop | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginDto) => Promise<void>;
  signup: (data: SignupDto) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  switchActiveShop: (shopId: string) => Promise<void>;
  clearError: () => void;
}

export * from './auth.types.js';
