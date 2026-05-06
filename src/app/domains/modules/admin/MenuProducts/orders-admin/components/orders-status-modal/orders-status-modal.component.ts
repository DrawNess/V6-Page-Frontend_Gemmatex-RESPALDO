import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiOrder } from '@shared/models/user-portal.model';
import { ORDER_STATUSES, STATUS_TRANSITIONS } from '../../orders-admin.constants';
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

  readonly selectedStatus  = signal<string>('');
  readonly statusMeta      = statusMeta;
  readonly getCustomerName = getCustomerName;
  readonly getTotal        = getTotal;

  readonly allowedStatuses = computed(() => {
    const current = this.order().status ?? 'pendiente';
    const allowed = STATUS_TRANSITIONS[current] ?? [];
    return ORDER_STATUSES.filter(s => allowed.includes(s.value));
  });

  readonly isFinal = computed(() => {
    const current = this.order().status ?? '';
    return (STATUS_TRANSITIONS[current] ?? []).length === 0;
  });

  constructor() {
    effect(() => {
      this.selectedStatus.set('');
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
