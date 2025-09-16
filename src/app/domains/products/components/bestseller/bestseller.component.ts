import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkWithHref } from '@angular/router';
import { Product } from '@shared/models/product.model';

@Component({
  selector: 'app-bestseller',
  standalone: true,
  imports: [CommonModule, RouterLinkWithHref],
  templateUrl: './bestseller.component.html',
  styleUrl: './bestseller.component.css'
})
export class BestsellerComponent {
@Input({ required: true }) product!: Product;
  @Input() rank?: number;                // opcional: #1, #2, #3...
  @Output() addToCart = new EventEmitter<Product>();

  get hasDiscount(): boolean {
    const p = this.product;
    return !!p?.discountPrice && p.discountPrice! > 0 && p.discountPrice! < p.price;
  }

  get discountPercent(): number {
    const p = this.product;
    if (!p?.price || !this.hasDiscount) return 0;
    return Math.round((1 - (p.discountPrice! / p.price)) * 100);
  }

  get isSoldOut(): boolean {
    const p = this.product;
    return !p?.is_active || (p?.stock ?? 0) <= 0;
  }

  get isNew(): boolean {
    const raw = this.product?.created_at;
    if (!raw) return false;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  }

  onAdd() {
    if (this.isSoldOut) return;
    this.addToCart.emit(this.product);
  }
}
