import { Component, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '@shared/services/product.service';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export default class ProductDetailComponent {

  @Input() id?: string;
  product = signal<Product | null>(null);
  /* cover = signal(''); */
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  ngOnInit() {
    if (this.id) {
      this.productService.getOne(this.id)
      .subscribe({
        next: (product) => {
          this.product.set(product);
          if (product.galleryUrls.length > 0) {
            this.cover.set(product.galleryUrls[0])
          }
        }
      })
    }

  }

/*   changeCover(newImg: string) {
    this.cover.set(newImg);
  } */

  addToCart() {
    const product = this.product();
    if (product) {
      this.cartService.addToCart(product);
    }
  }
    trackById = (_: number, p: Product) => p.id;
  // URL de tu imagen cuando la tengas; si la dejas '', se usa el degradado CMYK
heroUrl = 'https://iili.io/Fy4LpkP.jpg'; // ejemplo: 'assets/hero-sublimacion.jpg'
heroAlt = 'Fondo de impresión y sublimación';

cover = signal<string>('');
thumbs = signal<string[]>([]);

ngOnChanges() {
  const p = this.product?.();
  const base = p?.imageUrl ? [p.imageUrl] : [];
  let gal: string[] = [];

  const raw = p?.galleryUrls as any;
  if (Array.isArray(raw)) gal = raw.filter(Boolean);
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) gal = parsed.filter(Boolean);
      else gal = raw.split(/[,\n;|]+/).map(s => s.trim()).filter(Boolean);
    } catch {
      gal = raw.split(/[,\n;|]+/).map(s => s.trim()).filter(Boolean);
    }
  }

  const all = [...base, ...gal.filter(u => !base.includes(u))];
  this.thumbs.set(all);
  if (all.length) this.cover.set(all[0]);
}

changeCover(u: string) { this.cover.set(u); }

}
