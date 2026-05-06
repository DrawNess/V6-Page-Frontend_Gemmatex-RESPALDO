import { ApiOrder } from '@shared/models/user-portal.model';

export const ORDER_STATUSES = [
  { value: 'pendiente',  label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300',       dot: 'bg-blue-500' },
  { value: 'en_curso',   label: 'En curso',   color: 'bg-indigo-100 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' },
  { value: 'enviado',    label: 'Enviado',    color: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  { value: 'entregado',  label: 'Entregado',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  { value: 'cancelado',  label: 'Cancelado',  color: 'bg-red-100 text-red-800 border-red-300',          dot: 'bg-red-500' },
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number]['value'];

export const STATUS_PRIORITY: Record<string, number> = {
  pendiente: 0, confirmado: 1, en_curso: 2, enviado: 3, entregado: 4, cancelado: 5,
};

export const THRESHOLDS: Record<string, { warn: number; danger: number }> = {
  pendiente:  { warn: 12,  danger: 24 },
  confirmado: { warn: 6,   danger: 12 },
  en_curso:   { warn: 24,  danger: 48 },
  enviado:    { warn: 48,  danger: 96 },
};

export interface StatusAlert {
  status: string;
  level: 'warn' | 'danger';
  label: string;
  message: string;
  icon: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  pulse: boolean;
  orders: ApiOrder[];
}
