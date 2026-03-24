export interface ApiUser {
  id: number;
  email: string;
  role: string;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiCustomer {
  id: number;
  name: string;
  lastName: string;
  phone: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: ApiUser;
}

export interface ApiOrderItem {
  id: number;
  orderId?: number;
  variantId?: number;
  amount?: number;
  price?: number;
  name?: string;
  sku?: string;
  imageUrl?: string;
  brand?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ApiOrder {
  id: number;
  customerId?: number;
  status?: string;
  total?: number;
  customer?: ApiCustomer;
  createdAt?: string;
  updatedAt?: string;
  items?: ApiOrderItem[];
  [key: string]: unknown;
}
