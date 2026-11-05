export type Role = 'ADMIN' | 'CUSTOMER';

export type OrderStatus =
  | 'CREATED'
  | 'WAITING_CONFIRMATION'
  | 'DEVICE_RECEIVED'
  | 'CHECKING'
  | 'IN_PROGRESS'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'DELIVERED';

export type ServiceMethod = 'DROP_OFF' | 'ONSITE';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDuration: string;
  image?: string | null;
  isActive: boolean;
}

export interface ServiceOrderStatusHistoryItem {
  id: string;
  orderId?: string;
  status: OrderStatus;
  note?: string | null;
  createdAt: string | Date;
}

export interface ServiceOrderItem {
  id: string;
  ticketNumber: string;
  customerId: string;
  customer?: {
    name: string;
    email: string;
    phone?: string | null;
  };
  serviceId?: string | null;
  service?: ServiceItem | null;
  deviceType: string;
  deviceBrand: string;
  problemDescription: string;
  damageImage?: string | null;
  serviceMethod?: string;
  address?: string | null;
  estimatedPrice?: number | null;
  finalPrice?: number | null;
  status: OrderStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
  statusHistory?: ServiceOrderStatusHistoryItem[];
}

export type ItemCondition = 'NEW' | 'REFURBISHED' | 'SECOND';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand?: string | null;
  compatibility?: string | null;
  stock: number;
  minStock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  location?: string | null;
  condition: ItemCondition;
  notes?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

