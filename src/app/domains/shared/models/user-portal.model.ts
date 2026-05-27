/**
 * Después de la integración con SSO los identificadores son UUID v7 (string).
 * Los antiguos números (INT) ya no existen en el backend.
 */

export interface ApiRole {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  is_system?: boolean;
}

/** @deprecated Tras la integración SSO, los roles globales viajan en `AuthUser.roles`
 *  y los roles fine-grained de sucursal en `user_branches` (API-V6). No hay
 *  `user_roles` por usuario. */
export interface ApiUserRole {
  id: number | string;
  userId: string;
  roleId: string;
  branchId: number | null;
  role: ApiRole;
  branch?: ApiBranch | null;
}

export interface ApiUser {
  id: string;
  email: string;
  status?: 'pending' | 'active' | 'suspended' | 'deleted';
  email_verified_at?: string | null;
  roles?: string[];
  /** @deprecated */
  role?: string;
  /** @deprecated SSO ya no expone user_roles[]; usar roles[] globales y user_branches en API-V6. */
  userRoles?: ApiUserRole[];
  /** @deprecated Reemplazado por `email_verified_at != null`. */
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

export interface ApiOrderDeliveryAddress {
  departamento?: string | null;
  provincia?: string | null;
  ciudad?: string | null;
  calleAvenida?: string | null;
  numero?: string | null;
  casaDpto?: string | null;
  linkGoogleMaps?: string | null;
}

export interface ApiOrderDelivery {
  mode?: 'recojo_tienda' | 'envio_domicilio';
  whatsapp?: string | null;
  branch?: ApiBranch | null;
  /** Snapshot inmutable de la dirección al crear la orden. */
  address?: ApiOrderDeliveryAddress;
}

export interface ApiOrder {
  id: number;
  /** UUID del cliente en el SSO (snapshot al crear la orden). */
  customerUuid?: string;
  /** @deprecated Reemplazado por `customerUuid` tras integración SSO. */
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerDocument?: {
    type?: string | null;
    number?: string | null;
    razonSocial?: string | null;
  } | null;
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
