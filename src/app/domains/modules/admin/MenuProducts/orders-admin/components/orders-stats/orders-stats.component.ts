import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-orders-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-stats.component.html',
})
export class OrdersStatsComponent {
  pendingCount   = input.required<number>();
  confirmedCount = input.required<number>();
  enCursoCount   = input.required<number>();
  shippedCount   = input.required<number>();
  deliveredCount = input.required<number>();
  cancelledCount = input.required<number>();
  grossTotal     = input.required<number>();
  totalOrders    = input.required<number>();
}
