export type ReminderStatus = 'PENDING' | 'COMPLETED';
export type ReminderType = 'EXPIRY' | 'CUSTOM' | null;

export interface ReminderInventorySummary {
  id: string | null;
  lotId: string | null;
  name: string;
  companyName: string;
  location: string;
  vendorId: string | null;
  batchNo: string | null;
  maximumRetailPrice: number;
  costPrice: number;
  priceToRetail: number;
}

export interface ReminderDetail {
  id: string;
  inventoryId: string | null;
  reminderAt: string;
  expiryDate: string | null;
  snoozeDays: number;
  notes: string | null;
  status: ReminderStatus;
  type: ReminderType;
  inventory: ReminderInventorySummary | null;
}

export interface ReminderNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'REMINDER_DUE' | 'INVENTORY_LOW';
}

export type InventoryLowEvent = {
  shopId: string;
  inventoryId: string;
  productName: string;
  currentCount: number;
  threshold: number;
};

export interface CustomReminderInput {
  reminderAt: string;
  endDate: string;
  notes?: string;
}

export interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
