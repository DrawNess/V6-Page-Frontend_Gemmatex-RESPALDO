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
import { RouterLink } from '@angular/router';
import { ProductService } from '@shared/services/product.service';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { ProductComponent } from '@products/components/product/product.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-product-detail',
    imports: [CommonModule, ProductComponent, RouterLink],
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

  // ordenado de más específico a más genérico para evitar que todo matchee como Negro
  private readonly inkColors = [
    { label: 'Fluor Yellow', swatch: '#fef08a', variants: ['fluor-yellow', 'fluor y', 'fy', 'fluorescente-amarillo', 'amarillo-fluor', '(fy)', 'fy)', '(fy'] },
    { label: 'Fluor Pink', swatch: '#fb7185', variants: ['fluor-pink', 'fp', 'fluorescente-rosa', 'rosa-fluor', 'pink-fluor', '(fp)', 'fp)', '(fp'] },
    { label: 'Light Cian', swatch: '#67e8f9', variants: ['light-cian', 'light-cyan', 'lc', 'cian-claro', '(lc)', 'lc)', '(lc'] },
    { label: 'Light Magenta', swatch: '#f472b6', variants: ['light-magenta', 'lm', 'magenta-claro', '(lm)', 'lm)', '(lm'] },
    { label: 'Cian', swatch: '#0ea5e9', variants: ['cian', 'cyan', '(c)', 'c)'] },
    { label: 'Magenta', swatch: '#e11d48', variants: ['magenta', '(m)', 'm)'] },
    { label: 'Amarillo', swatch: '#eab308', variants: ['amarillo', 'yellow', '(y)', 'y)'] },
    { label: 'Blanco', swatch: '#f8fafc', variants: ['blanco', 'white', 'wh', 'w'] },
    { label: 'Negro', swatch: '#0f172a', variants: ['negro', 'black', 'bk', 'k', 'hdk', 'hd-k'] },
  ];
  private readonly inkColorTokens = new Set(this.inkColors.flatMap(c => c.variants.map(v => v.toLowerCase())));

  selectedColor = signal<string | null>(null);

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
  readonly isInkProduct = computed(() => this.isInkSubcategory(this.product()));
  readonly availableColors = computed<string[]>(() => {
    const canonicalSix = ['Negro', 'Cian', 'Magenta', 'Amarillo', 'Fluor Pink', 'Fluor Yellow'];
    const order = [
      ...canonicalSix,
      'Light Cian',
      'Light Magenta',
      'Blanco',
      'Gris'
    ];

    const bucket = new Set<string>();

    // colores detectados de variantes agrupadas (si existen)
    this.inkVariants()
      .map(v => this.detectInkColor(v).label)
      .filter(Boolean)
      .forEach(c => bucket.add(c));

    // asegurar los 6 básicos siempre presentes
    canonicalSix.forEach(c => bucket.add(c));

    const sorted = Array.from(bucket).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    return sorted;
  });
  isAdding = signal(false);
  added = signal(false);
  private addAnimTimeout: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;

  // similares
  similar = signal<Product[]>([]);
  // variantes de tinta (mismo modelo, distinto color)
  inkVariants = signal<Product[]>([]);
  trackByColor = (_: number, c: string) => c;

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
    this.resetInkSelections();

    this.productService.getOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (p) => {
        this.product.set(p || null);
        this.buildGallery(p);
        this.loadSimilar(p);
        this.setupInkSelections(p);
        this.loadInkVariants(p);
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

    const enriched: Product = this.isInkProduct()
      ? {
          ...p,
          selectedColor: this.selectedColor() || undefined
        }
      : p;

    this.cartService.addToCart(enriched);
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

  trackById = (_: number, p: Product) => p.id;

  // ——— Tintas helpers
  private isInkSubcategory(p?: Product | null): boolean {
    const sub =
      (p as any)?.subcategory?.name ??
      (p as any)?.subcategory?.slug ??
      (p as any)?.subcategory ??
      '';
    return String(sub).toLowerCase().includes('tinta');
  }

  private resetInkSelections() {
    this.selectedColor.set(null);
  }

  private setupInkSelections(p?: Product | null) {
    if (!this.isInkSubcategory(p)) {
      this.resetInkSelections();
      return;
    }

    const detectedColor = p ? this.detectInkColor(p).label : null;
    const colors = this.availableColors() as string[];

    const currentColor = this.selectedColor();
    if (detectedColor && colors.includes(detectedColor)) {
      this.selectedColor.set(detectedColor);
      return;
    }

    if (!currentColor || !colors.includes(currentColor)) {
      this.selectedColor.set(colors[0] ?? null);
    }
  }

  selectColor(color: string) {
    this.selectedColor.set(color);
  }

  inkColorLabel(p: Product): string { return this.detectInkColor(p).label; }
  inkSwatch(p: Product): string { return this.detectInkColor(p).swatch; }
  variantForColor(color: string): Product | null {
    return this.inkVariants().find(v => this.detectInkColor(v).label === color) ?? null;
  }
  swatchForColor(color: string): string {
    return this.inkColors.find(c => c.label === color)?.swatch ?? '#e2e8f0';
  }


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

  // ——— Ink grouping helpers
  private inkBaseKey(p?: Product | null): string | null {
    if (!p) return null;
    const source = (p.slug || p.name || '').toLowerCase();
    if (!source) return null;

    // normalizamos, eliminando paréntesis y signos
    const cleaned = source.replace(/[^a-z0-9]+/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);

    const filtered = tokens.filter(t => {
      if (this.inkColorTokens.has(t)) return false;
      if (/^t\d{3,}/.test(t)) return false; // códigos Epson tipo T7413
      if (/^\d+ml$/.test(t) || t === 'ml' || /^\d+$/.test(t)) return false; // volumen
      return true;
    });

    if (!filtered.length) return null;
    return filtered.join('-');
  }

  private detectInkColor(p: Product) {
    const haystack = `${p.name || ''} ${p.slug || ''} ${p.sku || ''}`.toLowerCase();
    for (const color of this.inkColors) {
      if (color.variants.some(v => haystack.includes(v))) {
        return color;
      }
    }
    return { label: 'Color', swatch: '#94a3b8', variants: [] };
  }

  private colorOrder(p: Product): number {
    const label = this.detectInkColor(p).label;
    const idx = this.inkColors.findIndex(c => c.label === label);
    return idx === -1 ? 999 : idx;
  }

  private loadInkVariants(p?: Product | null) {
    if (!this.isInkSubcategory(p)) { this.inkVariants.set([]); return; }

    const baseKey = this.inkBaseKey(p);
    if (!baseKey) { this.inkVariants.set([]); return; }

    this.productService.getProductos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const variants = (items || [])
            .filter(x => !!x && this.isInkSubcategory(x) && this.inkBaseKey(x) === baseKey)
            .sort((a, b) => this.colorOrder(a) - this.colorOrder(b));
          this.inkVariants.set(variants);
          this.refreshSelectedColor(p);
        },
        error: () => this.inkVariants.set([])
      });
  }

  private refreshSelectedColor(current?: Product | null) {
    const colors = this.availableColors();
    const detected = current ? this.detectInkColor(current).label : null;
    if (detected && colors.includes(detected)) {
      this.selectedColor.set(detected);
      return;
    }
    if (!colors.includes(this.selectedColor() || '')) {
      this.selectedColor.set(colors[0] ?? null);
    }
  }

}
