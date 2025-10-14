import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { OfferService } from '@shared/services/offer.service';
import { Offer } from '@shared/models/offer.model';
import { CartService } from '@shared/services/cart.service';

type SortKey = 'best' | 'discount' | 'priceAsc' | 'priceDesc';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.css'
})
export class OffersComponent {
  

}
