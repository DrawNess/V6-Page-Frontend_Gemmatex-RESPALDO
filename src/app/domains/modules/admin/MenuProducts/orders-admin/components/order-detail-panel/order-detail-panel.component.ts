import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiOrder } from '@shared/models/user-portal.model';
import {
  getItems, getItemName, getItemAmount, getItemPrice, getItemDescription,
  getCustomerName, getCustomerPhone, getCustomerLocation, getTotal,
} from '../../orders-admin.helpers';

@Component({
  selector: 'app-order-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-detail-panel.component.html',
})
export class OrderDetailPanelComponent {
  order = input.required<ApiOrder>();

  readonly getItems           = getItems;
  readonly getItemName        = getItemName;
  readonly getItemAmount      = getItemAmount;
  readonly getItemPrice       = getItemPrice;
  readonly getItemDescription = getItemDescription;
  readonly getCustomerName    = getCustomerName;
  readonly getCustomerPhone   = getCustomerPhone;
  readonly getCustomerLocation = getCustomerLocation;
  readonly getTotal           = getTotal;
}
