import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiOrder } from '@shared/models/user-portal.model';
import {
  getCustomerLocation, getCustomerName, getCustomerPhone,
  getDeliveryModeLabel,
  getItemAmount, getItemDescription, getItemName, getItemPrice,
  getItems, getTotal, statusMeta, timeAgo,
} from '../../orders-admin.helpers';
import { ApiStatusLog } from '@shared/models/user-portal.model';

@Component({
  selector: 'app-orders-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-detail.component.html',
  styleUrl: './orders-detail.component.css',
})
export class OrdersDetailComponent {
  order = input<ApiOrder | null>(null);
  now   = input.required<number>();

  openStatusModal = output<ApiOrder>();

  readonly getCustomerName      = getCustomerName;
  readonly getCustomerPhone     = getCustomerPhone;
  readonly getCustomerLocation  = getCustomerLocation;
  readonly getDeliveryModeLabel = getDeliveryModeLabel;
  readonly getItems            = getItems;
  readonly getItemName         = getItemName;
  readonly getItemAmount       = getItemAmount;
  readonly getItemPrice        = getItemPrice;
  readonly getItemDescription  = getItemDescription;
  readonly getTotal            = getTotal;
  readonly statusMeta          = statusMeta;

  readonly statusLogs = computed(() =>
    [...(this.order()?.statusLogs ?? [])].sort((a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    )
  );

  readonly showHistory = signal(false);

  timeAgo(dateStr?: string): string { return timeAgo(dateStr, this.now()); }

  statusLogLabel(log: ApiStatusLog): string {
    const from = log.fromStatus ? statusMeta(log.fromStatus).label : 'Creado';
    const to   = statusMeta(log.toStatus).label;
    return `${from} → ${to}`;
  }
}
