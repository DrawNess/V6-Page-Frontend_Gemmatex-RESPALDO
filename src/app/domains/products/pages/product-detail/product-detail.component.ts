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
import { CartService } from '@shared/services/cart.service';
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

  // estado principal
  product = signal<Product | null>(null);

  // galería
  cover  = signal<string>('');
  thumbs = signal<string[]>([]);

  // derivados
  readonly isOutOfStock = computed(() => (this.product()?.stock ?? 0) === 0);
  readonly selectedImage = computed(
    () => this.cover() || this.product()?.imageUrl || '/assets/placeholders/product.webp'
  );
  readonly productTags = computed(() => this.product()?.tags ?? []);
  isAdding = signal(false);
  added = signal(false);
  private addAnimTimeout: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;

  // similares
  similar = signal<Product[]>([]);

  ngOnInit() {
    if (this.id) this.loadProduct(this.id);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['id'] && changes['id'].currentValue) {
      this.loadProduct(changes['id'].currentValue);
    }
  }

  private loadProduct(id: string) {
    if (!id || id === this.lastLoadedId) return;

    this.lastLoadedId = id;
    this.product.set(null);
    this.cover.set('');
    this.thumbs.set([]);

    this.productService.getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (p) => {
        this.product.set(p || null);
        this.buildGallery(p);
        this.loadSimilar(p);
      },
      error: (err) => {
        console.error('Error cargando producto', err);
        this.product.set(null);
      }
    });
  }

  // ——— Galería
  private buildGallery(p?: Product | null) {
    const base = p?.imageUrl ? [p.imageUrl] : [];
    const gallery = this.parseGallery((p as any)?.galleryUrls);

    const all = [...base, ...gallery.filter(u => !base.includes(u))];
    this.thumbs.set(all);
    if (all.length) this.cover.set(all[0]);
  }

  private parseGallery(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    if (typeof raw !== 'string' || !raw.trim()) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // continuar con split
    }

    return raw
      .split(/[,\n;|]+/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map(String);
  }

  changeCover(u: string) { this.cover.set(u); }
  trackByThumb = (_: number, img: string) => img;


  onCoverError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/product.webp';
  }
  onThumbError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/thumb.webp';
  }

  // ——— CTA
  addToCart() {
    const p = this.product();
    if (!p) return;

    this.cartService.addToCart(p);
    this.triggerAddAnimation();
  }
  addToCartDirect(p: Product) {
    if (p) this.cartService.addToCart(p);
  }

  private triggerAddAnimation() {
    // reiniciar estados para permitir múltiples clics seguidos
    this.isAdding.set(false);
    this.added.set(false);

    if (this.addAnimTimeout) {
      clearTimeout(this.addAnimTimeout);
      this.addAnimTimeout = null;
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.isAdding.set(true);
      this.added.set(true);
      this.addAnimTimeout = setTimeout(() => {
        this.isAdding.set(false);
        this.added.set(false);
      }, 900);
    });
  }

  // ——— Similares
  private loadSimilar(p?: Product | null) {
    if (!p) { this.similar.set([]); return; }

    this.productService.getProductos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (items) => {
        const list = (items || []).filter(x => x && x.id !== p.id);

        const sub = (p.subcategory || '');
        const tagSet = new Set<string>((p.tags || []).map(t => String(t).toLowerCase()));
        const catId = (p as any)?.category?.id ?? (p as any)?.category_id;

        // score: subcat > tags > category
        const scored = list.map(q => {
          const qs = (q.subcategory || '');
          const sameSub = sub && qs === sub ? 1 : 0;

          const qTags = (q.tags || []).map(t => String(t).toLowerCase());
          let tagHits = 0;
          for (const t of qTags) if (tagSet.has(t)) tagHits++;

          const sameCat = catId && ((q as any)?.category?.id === catId || (q as any)?.category_id === catId) ? 1 : 0;

          const score = sameSub * 100 + tagHits * 10 + sameCat * 5;
          return { q, score };
        });

        // ordenar por score desc, fallback por stock/reciente
        scored.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const stockDiff = (b.q.stock || 0) - (a.q.stock || 0);
          if (stockDiff !== 0) return stockDiff;
          return String(b.q.updated_at || '').localeCompare(String(a.q.updated_at || ''));
        });

        // tomar 8 como máximo
        const top = scored.map(s => s.q).slice(0, 8);
        this.similar.set(top);
      },
      error: (err) => {
        console.error('Error cargando similares', err);
        this.similar.set([]);
      }
    });
  }

  // trackBy
  trackById = (_: number, p: Product) => p.id;

  ngOnDestroy(): void {
    if (this.addAnimTimeout) clearTimeout(this.addAnimTimeout);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  getDiscountPercent(): number {
  const price = this.product()?.price ?? 0;
  const discount = this.product()?.discountPrice ?? 0;
  if (price > 0 && discount > 0) {
    return Math.round(((price - discount) / price) * 100);
  }
  return 0;
}

}
