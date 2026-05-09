import { ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { ORDER_STATUSES, STATUS_PRIORITY, THRESHOLDS } from './orders-admin.constants';

export function getTotal(order: ApiOrder | null): number {
  if (!order) return 0;
  if (typeof order.total === 'number') return order.total;
  return getItems(order).reduce((s, item) => s + getItemAmount(item) * getItemPrice(item), 0);
}

export function getItems(order: ApiOrder | null): ApiOrderItem[] {
  return Array.isArray(order?.items) ? order!.items! : [];
}

export function getItemAmount(item: ApiOrderItem): number {
  return Number(item.OrderProduct?.amount ?? item.amount ?? 0);
}

export function getItemVariantId(item: ApiOrderItem): number | null {
  return item.OrderProduct?.variantId ?? item.variantId ?? null;
}

export function getItemName(item: ApiOrderItem): string {
  return String(item.shortDescription ?? item.name ?? item.sku ?? `Variante #${getItemVariantId(item) ?? '-'}`);
}

export function getItemDescription(item: ApiOrderItem): string | null {
  return item.description ?? item.shortDescription ?? null;
}

export function getItemPrice(item: ApiOrderItem): number {
  return Number(item.OrderProduct?.unitPrice ?? item.price ?? 0);
}

export function getCustomerName(order: ApiOrder): string {
  if (order.customer) {
    const { name = '', lastName = '' } = order.customer;
    const full = `${name} ${lastName}`.trim();
    if (full) return full;
  }
  if (order.contactName) return order.contactName;
  return `Cliente #${order.customerId ?? '?'}`;
}

export function getCustomerPhone(order: ApiOrder): string | null {
  return order.customer?.phone ?? order.contactWhatsapp ?? null;
}

export function getDeliveryModeLabel(order: ApiOrder): string | null {
  if (!order.deliveryMode) return null;
  return order.deliveryMode === 'recojo_tienda' ? 'Recojo en tienda' : 'Envío a domicilio';
}

export function getCustomerLocation(order: ApiOrder): string | null {
  const c = order.customer;
  if (!c) return null;
  const parts = [c.city, c.region, c.street, c.streetNumber].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function statusMeta(value?: string | null) {
  return (
    ORDER_STATUSES.find(s => s.value === value) ??
    { value: value ?? '?', label: value ?? 'Desconocido', color: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500' }
  );
}

export function timeAgo(dateStr: string | undefined, now: number): string {
  if (!dateStr) return '—';
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function hoursElapsed(dateStr: string | undefined, now: number): number {
  if (!dateStr) return 0;
  return (now - new Date(dateStr).getTime()) / 3_600_000;
}

export function rowUrgency(order: ApiOrder, now: number): 'danger' | 'warn' | 'normal' {
  const th = THRESHOLDS[order.status ?? ''];
  if (!th) return 'normal';
  const h = hoursElapsed(order.updatedAt ?? order.createdAt, now);
  if (h >= th.danger) return 'danger';
  if (h >= th.warn) return 'warn';
  return 'normal';
}

export const sortByPriorityThenDate = (a: ApiOrder, b: ApiOrder): number => {
  const pa = STATUS_PRIORITY[a.status ?? ''] ?? 99;
  const pb = STATUS_PRIORITY[b.status ?? ''] ?? 99;
  if (pa !== pb) return pa - pb;
  const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return bt - at;
};
