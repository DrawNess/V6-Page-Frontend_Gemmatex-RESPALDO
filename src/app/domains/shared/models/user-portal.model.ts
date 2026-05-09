export interface ApiRole {
  id: number;
  slug: string;
  name: string;
}

export interface ApiUserRole {
  id: number;
  userId: number;
  roleId: number;
  branchId: number | null;
  role: ApiRole;
  branch?: ApiBranch | null;
}

export interface ApiUser {
  id: number;
  email: string;
  /** @deprecated — use userRoles[] after API-V6 */
  role?: string;
  roles?: string[];
  userRoles?: ApiUserRole[];
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

export interface ApiOrderItemProductRef {
  id: number;
  name: string;
  slug?: string;
  brand?: string;
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
  galleryUrls?: string[];
  unitOfMeasure?: string;
  dimensions?: string;
  tags?: string[];
  outlet?: boolean;
  variantId?: number;
  amount?: number;
  orderId?: number;
  product?: ApiOrderItemProductRef;
  color?: { id: number; name: string; hex: string } | null;
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

export interface ApiOrderContact {
  name?: string;
  whatsapp?: string | null;
}

export interface ApiOrderDelivery {
  mode?: 'recojo_tienda' | 'envio_domicilio';
  whatsapp?: string | null;
  branch?: ApiBranch | null;
}

export interface ApiOrder {
  id: number;
  customerId?: number;
  customerName?: string;
  status?: string;
  detail?: string | null;
  total?: number;
  /** @deprecated — usar contact.name */
  contactName?: string;
  /** @deprecated — usar contact.whatsapp */
  contactWhatsapp?: string;
  /** @deprecated — usar delivery.whatsapp */
  deliveryWhatsapp?: string | null;
  /** @deprecated — usar delivery.mode */
  deliveryMode?: 'recojo_tienda' | 'envio_domicilio';
  /** @deprecated — usar delivery.branch?.id */
  branchId?: number | null;
  /** @deprecated — usar delivery.branch */
  branch?: ApiBranch | null;
  contact?: ApiOrderContact;
  delivery?: ApiOrderDelivery;
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
