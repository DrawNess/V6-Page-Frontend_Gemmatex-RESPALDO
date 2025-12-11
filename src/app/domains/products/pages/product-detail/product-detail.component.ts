import { Component, Input, inject, signal, computed, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '@shared/services/product.service';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { ProductComponent } from '@products/components/product/product.component';

@Component({
    selector: 'app-product-detail',
    imports: [CommonModule, ProductComponent],
    templateUrl: './product-detail.component.html',
    styleUrls: ['./product-detail.component.css']
})
export default class ProductDetailComponent implements OnInit, OnChanges{
@Input() id?: string;

  private productService = inject(ProductService);
  private cartService = inject(CartService);

  // estado principal
  product = signal<Product | null>(null);

  // galería
  cover  = signal<string>('');
  thumbs = signal<string[]>([]);

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
    this.product.set(null);
    this.cover.set('');
    this.thumbs.set([]);

    this.productService.getOne(id).subscribe({
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
    let gal: string[] = [];

    const raw = (p as any)?.galleryUrls;
    if (Array.isArray(raw)) {
      gal = raw.filter(Boolean);
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) gal = parsed.filter(Boolean);
        else gal = raw.split(/[,\n;|]+/).map((s: string) => s.trim()).filter(Boolean);
      } catch {
        gal = raw.split(/[,\n;|]+/).map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const all = [...base, ...gal.filter(u => !base.includes(u))];
    this.thumbs.set(all);
    if (all.length) this.cover.set(all[0]);
  }

  changeCover(u: string) { this.cover.set(u); }
  /* trackByThumb = (_: number, url: string) => url; */
  trackByThumb(index: number, _img: unknown) {
    return index;
  }


  onCoverError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/product.webp';
  }
  onThumbError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/thumb.webp';
  }

  // ——— CTA
  addToCart() {
    const p = this.product();
    if (p) this.cartService.addToCart(p);
  }
  addToCartDirect(p: Product) {
    if (p) this.cartService.addToCart(p);
  }

  // ——— Similares
  private loadSimilar(p?: Product | null) {
    if (!p) { this.similar.set([]); return; }

    this.productService.getProductos().subscribe({
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

}
