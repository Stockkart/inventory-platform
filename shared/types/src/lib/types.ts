// Import API types for use in store interfaces
import type {
  User,
  Shop,
  LoginDto,
  SignupDto,
  Order,
  CreateOrderDto,
  Product,
  CreateProductDto,
  UpdateProductDto,
} from './api-types.js';

// Store State Interfaces
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

export interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  createOrder: (data: CreateOrderDto) => Promise<Order>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  setSelectedOrder: (order: Order | null) => void;
  clearError: () => void;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getItemCount: () => number;
}

export interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  createProduct: (data: CreateProductDto) => Promise<void>;
  updateProduct: (id: string, data: UpdateProductDto) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  fetchLowStock: () => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
  clearError: () => void;
}

// UI Component Interfaces
export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export type Plan = {
  name: string;
  label?: string;
  description: string;
  price: string;
  priceSuffix?: string;
  highlight?: boolean;
  features: string[];
};

// Feature-specific Types
export type OnboardingStep =
  | 'name'
  | 'shopType'
  // | 'businessId'
  | 'contactPhone'
  | 'contactEmail'
  | 'location'
  | 'businessDetails'
  | 'tagline';
