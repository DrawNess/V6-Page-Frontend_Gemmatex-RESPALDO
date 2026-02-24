import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product } from '@shared/models/product.model';

@Component({
    selector: 'app-product',
    imports: [CommonModule],
    templateUrl: './product.component.html',
    styleUrls: ['./product.component.css']
})
export class ProductComponent {
  @Input({ required: true }) product!: Product;
  @Output() addToCart = new EventEmitter<Product>();
  constructor(private router: Router) {}

  addToCartHandler() { this.addToCart.emit(this.product); }

  private productId(): string | number | null {
    const id = (this.product as any)?.id;
    if (id === null || id === undefined || id === '') return null;
    return id;
  }

  productHref(): string | null {
    const id = this.productId();
    return id !== null ? `/product/${id}` : null;
  }

  goToProduct(event: Event) {
    event.preventDefault();
    const id = this.productId();
    if (id === null) return;
    this.router.navigate(['/product', id]);
  }

  onImgError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/product.svg';
  }
}
