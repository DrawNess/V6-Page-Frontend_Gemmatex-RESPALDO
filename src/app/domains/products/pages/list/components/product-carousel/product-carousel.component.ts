import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '@shared/models/product.model';
import { ProductService } from '@shared/services/product.service';
import { CartService, CartItem } from '@shared/services/cart.service';
import { ProductComponent } from '@products/components/product/product.component';

@Component({
  selector: 'app-product-carousel',
  imports: [RouterLink, ProductComponent],
  templateUrl: './product-carousel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCarouselComponent implements OnInit, OnDestroy {
  private static readonly PAGE_SIZE   = 24;
  private static readonly PICK_COUNT  = 10;
  private static readonly INTERVAL_MS = 3800;

  private productService = inject(ProductService);
  private cartService    = inject(CartService);

  products = signal<Product[]>([]);

  @ViewChild('track', { static: false }) track?: ElementRef<HTMLDivElement>;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit()    { this.load(); }
  ngOnDestroy() { this.pause(); }

  private load() {
    this.productService.listProducts({ page: 1, pageSize: ProductCarouselComponent.PAGE_SIZE }).subscribe({
      next: (res) => {
        const list = (res?.data ?? []).slice();
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        this.products.set(list.slice(0, ProductCarouselComponent.PICK_COUNT));
      },
      error: () => this.products.set([])
    });
  }

  addToCart(p: Product) {
    const variant = p.variants?.find(v => v.is_active && v.stock > 0) ?? p.variants?.[0];
    if (!variant) return;
    const item: CartItem = {
      variantId:     variant.id,
      productId:     p.id,
      name:          p.name,
      sku:           variant.sku,
      price:         Number(variant.price),
      discountPrice: variant.discountPrice != null ? Number(variant.discountPrice) : null,
      imageUrl:      variant.imageUrl || p.imageUrl,
      colorName:     variant.color?.name ?? null,
      colorHex:      variant.color?.hex  ?? null,
    };
    this.cartService.addToCart(item);
  }

  private stepPx() {
    const el = this.track?.nativeElement;
    if (!el) return 0;
    const first = el.querySelector<HTMLElement>('.snap-start');
    if (!first) return 0;
    return first.clientWidth + parseFloat(getComputedStyle(el).columnGap || '0');
  }

  next() { this.track?.nativeElement.scrollBy({ left:  this.stepPx(), behavior: 'smooth' }); this.restart(); }
  prev() { this.track?.nativeElement.scrollBy({ left: -this.stepPx(), behavior: 'smooth' }); this.restart(); }

  resume() { if (!this.timer) this.timer = setInterval(() => this.next(), ProductCarouselComponent.INTERVAL_MS); }
  pause()  { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  private restart() { this.pause(); this.resume(); }
}
