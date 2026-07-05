import type {
  CreateOrderDto,
  CreateProductDto,
  Order,
  Product,
  UpdateProductDto,
} from './legacy.types.js';

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
