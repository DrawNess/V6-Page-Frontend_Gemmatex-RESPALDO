import { Component, computed, effect, ElementRef, input, output, signal, ViewChild } from '@angular/core';
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
  @ViewChild('listEl')   listEl!:   ElementRef<HTMLElement>;
  @ViewChild('panelEl')  panelEl!:  ElementRef<HTMLElement>;

  orders          = input.required<ApiOrder[]>();
  loading         = input<boolean>(false);
  selectedOrderId = input<number | null>(null);
  now             = input.required<number>();

  orderSelected = output<ApiOrder>();

  readonly searchText   = signal('');
  readonly focusedIndex = signal(-1);

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

  constructor() {
    // Scroll focused row into view
    effect(() => {
      const idx = this.focusedIndex();
      if (idx < 0) return;
      const el = this.listEl?.nativeElement?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    // Sync focusedIndex when selectedOrderId changes from outside
    effect(() => {
      const id = this.selectedOrderId();
      if (id == null) return;
      const idx = this.filtered().findIndex(o => o.id === id);
      if (idx >= 0) {
        this.focusedIndex.set(idx);
      }
    });
  }

  onSearch(q: string): void {
    this.searchText.set(q);
    this.focusedIndex.set(-1);
  }

  onKeyDown(event: KeyboardEvent): void {
    const list = this.filtered();
    if (!list.length) return;
    const cur = this.focusedIndex();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedIndex.set(cur < 0 ? 0 : Math.min(cur + 1, list.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedIndex.set(cur <= 0 ? 0 : cur - 1);
    } else if (event.key === 'Enter') {
      const order = list[cur < 0 ? 0 : cur];
      if (order) this.orderSelected.emit(order);
    }
  }

  select(order: ApiOrder, idx: number): void {
    this.focusedIndex.set(idx);
    this.orderSelected.emit(order);
    // Return focus to panel so keyboard nav works after click
    this.panelEl?.nativeElement?.focus();
  }

  timeAgo(dateStr?: string): string { return timeAgo(dateStr, this.now()); }
  rowUrgency(o: ApiOrder): string   { return rowUrgency(o, this.now()); }
}
