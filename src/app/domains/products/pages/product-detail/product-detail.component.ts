import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  SimpleChanges,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '@shared/services/product.service';
import { Product } from '@shared/models/product.model';
import { Variant } from '@shared/models/variant.model';
import { CartService, CartItem } from '@shared/services/cart.service';
import { ProductComponent } from '@products/components/product/product.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, ProductComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class ProductDetailComponent implements OnInit, OnChanges, OnDestroy {
  @Input() id?: string;

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private lastLoadedId: string | null = null;

  product = signal<Product | null>(null);
  selectedVariant = signal<Variant | null>(null);

  cover = signal<string>('');
  thumbs = signal<string[]>([]);

  similar = signal<Product[]>([]);

  isAdding = signal(false);
  added = signal(false);
  private addAnimTimeout: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;

  readonly activeVariants = computed(() =>
    (this.product()?.variants ?? []).filter(v => v.is_active)
  );

  readonly hasMultipleVariants = computed(() => this.activeVariants().length > 1);

  readonly hasColors = computed(() =>
    this.activeVariants().some(v => v.color != null)
  );

  readonly isOutOfStock = computed(() => (this.selectedVariant()?.stock ?? 0) === 0);

  readonly hasDiscount = computed(() => {
    const d = this.selectedVariant()?.discountPrice;
    return d != null && Number(d) > 0;
  });

  readonly selectedImage = computed(
    () => this.cover()
      || this.selectedVariant()?.imageUrl
      || this.product()?.imageUrl
      || '/assets/placeholders/product.svg'
  );

  ngOnInit() {
    if (this.id) this.loadProduct(this.id);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id']?.currentValue) {
      this.loadProduct(changes['id'].currentValue);
    }
  }

  private loadProduct(id: string) {
    if (!id || id === this.lastLoadedId) return;
    this.lastLoadedId = id;
    this.product.set(null);
    this.selectedVariant.set(null);
    this.cover.set('');
    this.thumbs.set([]);

    this.productService.getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.product.set(p ?? null);
          this.selectDefaultVariant(p);
          this.loadSimilar(p);
        },
        error: (err) => {
          console.error('Error cargando producto', err);
          this.product.set(null);
        }
      });
  }

  private selectDefaultVariant(p?: Product | null) {
    if (!p?.variants?.length) {
      this.selectedVariant.set(null);
      this.buildGalleryFromProduct(p);
      return;
    }
    const active = p.variants.filter(v => v.is_active);
    const withStock = active.find(v => v.stock > 0) ?? active[0] ?? p.variants[0];
    this.selectVariant(withStock);
  }

  selectVariant(v: Variant) {
    this.selectedVariant.set(v);
    this.buildGallery(v);
  }

  private buildGallery(v?: Variant | null) {
    const base = v?.imageUrl ? [v.imageUrl] : [];
    const gallery = this.parseGallery(v?.galleryUrls);
    const all = [...base, ...gallery.filter(u => !base.includes(u))];
    this.thumbs.set(all);
    if (all.length) this.cover.set(all[0]);
  }

  private buildGalleryFromProduct(p?: Product | null) {
    const all = p?.imageUrl ? [p.imageUrl] : [];
    this.thumbs.set(all);
    if (all.length) this.cover.set(all[0]);
  }

  private parseGallery(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch { /* continue with split */ }
    return raw.split(/[,\n;|]+/).map((s: string) => s.trim()).filter(Boolean);
  }

  changeCover(u: string) { this.cover.set(u); }
  trackByThumb = (_: number, img: string) => img;
  trackById = (_: number, p: Product) => p.id;
  trackByVariantId = (_: number, v: Variant) => v.id;

  onCoverError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/product.svg';
  }
  onThumbError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/thumb.svg';
  }

  // ——— CTA
  addToCart() {
    const v = this.selectedVariant();
    const p = this.product();
    if (!v || !p) return;

    const item: CartItem = {
      variantId: v.id,
      productId: p.id,
      name: p.name,
      sku: v.sku,
      price: Number(v.price),
      discountPrice: v.discountPrice != null ? Number(v.discountPrice) : null,
      imageUrl: v.imageUrl || p.imageUrl,
      colorName: v.color?.name ?? null,
      colorHex: v.color?.hex ?? null,
    };

    this.cartService.addToCart(item);
    this.triggerAddAnimation();
  }

  addToCartDirect(p: Product) {
    const variant = p.variants?.find(v => v.is_active && v.stock > 0) ?? p.variants?.[0];
    if (!variant) return;
    const item: CartItem = {
      variantId: variant.id,
      productId: p.id,
      name: p.name,
      sku: variant.sku,
      price: Number(variant.price),
      discountPrice: variant.discountPrice != null ? Number(variant.discountPrice) : null,
      imageUrl: variant.imageUrl || p.imageUrl,
      colorName: variant.color?.name ?? null,
      colorHex: variant.color?.hex ?? null,
    };
    this.cartService.addToCart(item);
  }

  private triggerAddAnimation() {
    this.isAdding.set(false);
    this.added.set(false);
    if (this.addAnimTimeout) { clearTimeout(this.addAnimTimeout); this.addAnimTimeout = null; }
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.isAdding.set(true);
      this.added.set(true);
      this.addAnimTimeout = setTimeout(() => {
        this.isAdding.set(false);
        this.added.set(false);
      }, 2500);
    });
  }

  // ——— Similares
  private loadSimilar(p?: Product | null) {
    if (!p) { this.similar.set([]); return; }
    this.productService.getRelatedProducts(p.id, 8)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.similar.set((items ?? []).filter(x => x && x.id !== p.id).slice(0, 8));
        },
        error: () => this.similar.set([])
      });
  }

  isLightColor(hex: string): boolean {
    if (!hex || !hex.startsWith('#')) return false;
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 200;
    } catch { return false; }
  }

  ngOnDestroy(): void {
    if (this.addAnimTimeout) clearTimeout(this.addAnimTimeout);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}
