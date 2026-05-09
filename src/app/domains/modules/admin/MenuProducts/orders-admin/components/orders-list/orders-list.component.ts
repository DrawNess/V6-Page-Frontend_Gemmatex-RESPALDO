import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiOrder } from '@shared/models/user-portal.model';
import { ORDER_STATUSES } from '../../orders-admin.constants';
import {
  getCustomerName, getItems, getTotal,
  rowUrgency, statusMeta, timeAgo,
} from '../../orders-admin.helpers';
import { OrderDetailPanelComponent } from '../order-detail-panel/order-detail-panel.component';
import { BranchCacheService } from '@shared/services/branch-cache.service';
import { TokenService } from '@shared/services/token.service';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderDetailPanelComponent],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.css',
})
export class OrdersListComponent {
  orders       = input.required<ApiOrder[]>();
  loading      = input<boolean>(false);
  statusTab    = input<string>('pendiente');
  statusCounts = input<Partial<Record<string, number>>>({});
  now          = input.required<number>();
  /** Si el padre quiere expandir un pedido concreto después de una carga */
  expandOrderId = input<number | null>(null);

  tabChange        = output<string>();
  refreshRequested = output<void>();
  openStatusModal  = output<ApiOrder>();

  private readonly branchCache = inject(BranchCacheService);
  private readonly tokenService = inject(TokenService);

  readonly statuses      = ORDER_STATUSES;
  readonly searchText    = signal('');
  readonly expandedId    = signal<number | null>(null);
  readonly showCityCol   = this.tokenService.hasRole('admin');

  getBranchCity(order: ApiOrder): string {
    return order.branch?.city ?? this.branchCache.getCityById(order.branchId as number) ?? '—';
  }

  readonly filtered = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    return this.orders().filter(o => {
      if (!q) return true;
      const name = getCustomerName(o).toLowerCase();
      return String(o.id).includes(q) || name.includes(q) || (o.status ?? '').toLowerCase().includes(q);
    });
  });

  readonly getCustomerName = getCustomerName;
  readonly getItems        = getItems;
  readonly getTotal        = getTotal;
  readonly statusMeta      = statusMeta;

  timeAgo(dateStr?: string): string {
    return timeAgo(dateStr, this.now());
  }

  rowUrgency(order: ApiOrder): 'danger' | 'warn' | 'normal' {
    return rowUrgency(order, this.now());
  }

  toggleExpand(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  constructor() {
    effect(() => {
      const id = this.expandOrderId();
      if (id != null) this.expandedId.set(id);
    });
  }
}
