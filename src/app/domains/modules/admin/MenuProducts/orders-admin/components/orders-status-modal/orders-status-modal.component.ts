import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiOrder } from '@shared/models/user-portal.model';
import { ORDER_STATUSES } from '../../orders-admin.constants';
import { getCustomerName, getTotal, statusMeta } from '../../orders-admin.helpers';

@Component({
  selector: 'app-orders-status-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-status-modal.component.html',
  styleUrl: './orders-status-modal.component.css',
})
export class OrdersStatusModalComponent {
  order  = input.required<ApiOrder>();
  saving = input<boolean>(false);

  confirmed = output<{ orderId: number; newStatus: string }>();
  cancelled = output<void>();

  readonly statuses        = ORDER_STATUSES;
  readonly selectedStatus  = signal<string>('');
  readonly statusMeta      = statusMeta;
  readonly getCustomerName = getCustomerName;
  readonly getTotal        = getTotal;

  constructor() {
    effect(() => {
      this.selectedStatus.set(this.order().status ?? 'pendiente');
    });
  }

  get hasChanged(): boolean {
    return this.selectedStatus() !== this.order().status;
  }

  confirm(): void {
    if (!this.hasChanged || this.saving()) return;
    this.confirmed.emit({ orderId: this.order().id, newStatus: this.selectedStatus() });
  }
}
