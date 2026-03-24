import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkWithHref } from '@angular/router';
import { Product } from '@shared/models/product.model';
import { Variant } from '@shared/models/variant.model';

@Component({
  selector: 'app-bestseller',
  standalone: true,
  imports: [CommonModule, RouterLinkWithHref],
  templateUrl: './bestseller.component.html',
  styleUrl: './bestseller.component.css'
})
export class BestsellerComponent {
  @Input({ required: true }) product!: Product;
  @Input() rank?: number;
  @Output() addToCart = new EventEmitter<Product>();

  private get primaryVariant(): Variant | null {
    const variants = this.product?.variants ?? [];
    const active = variants.filter(v => v.is_active);
    return active.find(v => v.stock > 0) ?? active[0] ?? variants[0] ?? null;
  }

  get price(): number { return Number(this.primaryVariant?.price ?? 0); }
  get discountPrice(): number | null {
    const d = this.primaryVariant?.discountPrice;
    return d != null && Number(d) > 0 ? Number(d) : null;
  }
  get sku(): string { return this.primaryVariant?.sku ?? ''; }

  get hasDiscount(): boolean {
    const d = this.discountPrice;
    return d !== null && d > 0 && d < this.price;
  }

  get discountPercent(): number {
    if (!this.price || !this.hasDiscount) return 0;
    return Math.round((1 - (this.discountPrice! / this.price)) * 100);
  }

  get isSoldOut(): boolean {
    return !this.product?.is_active || (this.primaryVariant?.stock ?? 0) <= 0;
  }

  get isNew(): boolean { return false; }

  onAdd() {
    if (this.isSoldOut) return;
    this.addToCart.emit(this.product);
  }
}
