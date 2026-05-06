import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ORDER_STATUSES } from '../../orders-admin.constants';

@Component({
  selector: 'app-orders-command-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-command-bar.component.html',
  styleUrl: './orders-command-bar.component.css',
})
export class OrdersCommandBarComponent {
  counts       = input.required<Partial<Record<string, number>>>();
  activeStatus = input.required<string>();
  loading      = input<boolean>(false);
  totalOrders  = input<number>(0);

  filterChange     = output<string>();
  refreshRequested = output<void>();

  readonly statuses = ORDER_STATUSES;

  countFor(status: string): number {
    return this.counts()[status] ?? 0;
  }
}
