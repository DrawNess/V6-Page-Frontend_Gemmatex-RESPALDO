import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusAlert } from '../../orders-admin.constants';
import { timeAgo } from '../../orders-admin.helpers';

@Component({
  selector: 'app-orders-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-alerts.component.html',
  styleUrl: './orders-alerts.component.css',
})
export class OrdersAlertsComponent {
  alerts           = input.required<StatusAlert[]>();
  dangerAlertCount = input.required<number>();
  now              = input.required<number>();

  goToOrder = output<{ status: string; orderId: number }>();

  readonly collapsed = signal(false);

  timeAgo(dateStr?: string): string {
    return timeAgo(dateStr, this.now());
  }
}
