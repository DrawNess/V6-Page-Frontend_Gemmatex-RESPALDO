import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiOrder } from '@shared/models/user-portal.model';
import {
  getCustomerLocation, getCustomerName, getCustomerPhone,
  getItemAmount, getItemDescription, getItemName, getItemPrice,
  getItems, getTotal, statusMeta, timeAgo,
} from '../../orders-admin.helpers';

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

  readonly getCustomerName     = getCustomerName;
  readonly getCustomerPhone    = getCustomerPhone;
  readonly getCustomerLocation = getCustomerLocation;
  readonly getItems            = getItems;
  readonly getItemName         = getItemName;
  readonly getItemAmount       = getItemAmount;
  readonly getItemPrice        = getItemPrice;
  readonly getItemDescription  = getItemDescription;
  readonly getTotal            = getTotal;
  readonly statusMeta          = statusMeta;

  timeAgo(dateStr?: string): string { return timeAgo(dateStr, this.now()); }
}
