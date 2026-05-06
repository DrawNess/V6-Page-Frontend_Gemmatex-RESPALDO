import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiOrder } from '@shared/models/user-portal.model';
import { getCustomerName, getTotal, rowUrgency, statusMeta, timeAgo } from '../../orders-admin.helpers';

@Component({
  selector: 'app-orders-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-master.component.html',
  styleUrl: './orders-master.component.css',
})
export class OrdersMasterComponent {
  orders          = input.required<ApiOrder[]>();
  loading         = input<boolean>(false);
  selectedOrderId = input<number | null>(null);
  now             = input.required<number>();

  orderSelected = output<ApiOrder>();

  readonly searchText = signal('');

  readonly filtered = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    return this.orders().filter(o => {
      if (!q) return true;
      const name    = getCustomerName(o).toLowerCase();
      const contact = (o.contactName ?? '').toLowerCase();
      const phone   = (o.contactWhatsapp ?? '').toLowerCase();
      return String(o.id).includes(q) || name.includes(q) || contact.includes(q) || phone.includes(q);
    });
  });

  readonly getCustomerName = getCustomerName;
  readonly getTotal        = getTotal;
  readonly statusMeta      = statusMeta;

  timeAgo(dateStr?: string): string      { return timeAgo(dateStr, this.now()); }
  rowUrgency(o: ApiOrder): string        { return rowUrgency(o, this.now()); }
}
