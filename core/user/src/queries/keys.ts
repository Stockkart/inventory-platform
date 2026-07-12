import { createQueryKeyFactory } from '@inventory-platform/query';
import type { CustomersListParams } from '../api/customers.api';
import type { VendorsListParams } from '../api/vendors.api';

const base = createQueryKeyFactory('user');

export const userKeys = {
  ...base,
  customers: (params: CustomersListParams) => [...base.all, 'customers', params] as const,
  vendors: (params: VendorsListParams) => [...base.all, 'vendors', params] as const,
  shopRbacAdmin: (shopId: string) => [...base.all, 'shop-rbac', shopId] as const,
};

export const USER_MODULE_VERSION = '0.1.0';
