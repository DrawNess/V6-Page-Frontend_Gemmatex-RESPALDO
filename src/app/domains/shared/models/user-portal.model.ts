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
  company?: string | null;
  region?: string | null;
  city?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  apartment?: string | null;
  email?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: ApiUser;
}

export interface ApiOrderProduct {
  id: number;
  orderId: number;
  variantId: number;
  amount: number;
  unitPrice?: string | number;
}

export interface ApiOrderItem {
  id: number;
  sku?: string;
  description?: string;
  shortDescription?: string;
  price?: number | string;
  discountPrice?: number | string | null;
  stock?: number;
  name?: string;
  brand?: string;
  imageUrl?: string;
  variantId?: number;
  amount?: number;
  orderId?: number;
  OrderProduct?: ApiOrderProduct;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ApiStatusLog {
  id: number;
  orderId?: number;
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  createdAt?: string;
  admin?: { id: number; email: string };
}

export interface ApiBranch {
  id: number;
  name: string;
  city: string;
  address: string;
  phone?: string;
  is_active?: boolean;
}

export interface ApiOrder {
  id: number;
  customerId?: number;
  status?: string;
  detail?: string;
  total?: number;
  contactName?: string;
  contactWhatsapp?: string;
  deliveryWhatsapp?: string | null;
  deliveryMode?: 'recojo_tienda' | 'envio_domicilio';
  branchId?: number | null;
  branch?: ApiBranch | null;
  customer?: ApiCustomer;
  createdAt?: string;
  updatedAt?: string;
  items?: ApiOrderItem[];
  statusLogs?: ApiStatusLog[];
  [key: string]: unknown;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
