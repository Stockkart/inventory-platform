// Alert types
export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  status: 'critical' | 'warning';
  createdAt: string;
}

// Reminder types
export type ReminderStatus = 'PENDING' | 'COMPLETED';
export type ReminderType = 'EXPIRY' | 'CUSTOM' | null;

export interface Reminder {
  id: string;
  inventoryId: string | null;
  reminderAt: string;
  expiryDate: string | null;
  snoozeDays: number;
  notes: string | null;
  status: ReminderStatus;
  type: ReminderType;
}

export interface CreateReminderDto {
  inventoryId?: string;
  reminderAt: string;
  endDate?: string;
  notes?: string;
  type?: ReminderType;
}

export interface UpdateReminderDto {
  reminderAt?: string;
  endDate?: string;
  notes?: string;
  status?: ReminderStatus;
}

export interface CustomReminderInput {
  reminderAt: string;
  endDate: string;
  notes?: string;
}

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

export interface ReminderDetail extends Reminder {
  inventory: ReminderInventorySummary | null;
}

export interface ReminderDetailListResponse {
  data: ReminderDetail[];
}

export interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ReminderDetailListResponse {
  data: ReminderDetail[];
  meta: PageMeta;
}

//event types
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
