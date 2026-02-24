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
import { SubcategoryService } from '@shared/services/subcategory.service';
import { ProductComponent } from '@products/components/product/product.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map, of, switchMap } from 'rxjs';
import {
  colorOrder,
  detectInkColor,
  productInkHaystack,
  productInkModelHaystack,
  isInkSubcategory,
  isInkSubcategoryStrict,
  swatchForColor
} from '@shared/utils/ink-utils';

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
  private subcategoryService = inject(SubcategoryService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private lastLoadedId: string | null = null;

  selectedColor = signal<string | null>(null);

  // estado principal
  product = signal<Product | null>(null);

  // galería
  cover  = signal<string>('');
  thumbs = signal<string[]>([]);

  // derivados
  readonly isOutOfStock = computed(() => (this.product()?.stock ?? 0) === 0);
  readonly selectedImage = computed(
    () => this.cover() || this.product()?.imageUrl || '/assets/placeholders/product.svg'
  );
  readonly isInkProduct = computed(() => isInkSubcategoryStrict(this.product())); // UI: solo mostrar variantes en subcategoría tintas real.
  readonly availableColors = computed<string[]>(() => {
    const canonicalSix = ['Cian', 'Magenta', 'Amarillo', 'Negro', 'Fluor Pink', 'Fluor Yellow'];
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
      .map(v => this.inkVariantLabel(v))
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
    (e.target as HTMLImageElement).src = '/assets/placeholders/product.svg';
  }
  onThumbError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/thumb.svg';
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

    this.productService.getRelatedProducts(p.id, 8)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (items) => {
        this.similar.set((items || []).filter(x => x && x.id !== p.id).slice(0, 8));
      },
      error: (err) => {
        console.error('Error cargando similares', err);
        this.similar.set([]);
      }
    });
  }

  trackById = (_: number, p: Product) => p.id;

  // ——— Tintas helpers
  private resetInkSelections() {
    this.selectedColor.set(null);
  }

  private inkVariantLabel(p?: Product | null): string {
    if (!p) return 'Color';
    const h = productInkHaystack(p);
    if (
      h.includes('liquido de mantenimiento') ||
      h.includes('liquido mantenimiento') ||
      h.includes('maintenance liquid') ||
      h.includes('maintenance fluid')
    ) {
      return 'Mantenimiento';
    }
    return detectInkColor(p).label;
  }

  private setupInkSelections(p?: Product | null) {
    if (!isInkSubcategoryStrict(p)) {
      this.resetInkSelections();
      return;
    }

    const detectedColor = p ? this.inkVariantLabel(p) : null;
    const colors = this.availableColors();

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

  inkColorLabel(p: Product): string { return this.inkVariantLabel(p); }
  inkSwatch(p: Product): string { return detectInkColor(p).swatch; }
  variantForColor(color: string): Product | null {
    return this.inkVariants().find(v => this.inkVariantLabel(v) === color) ?? null;
  }
  swatchForColor(color: string): string {
    if (color === 'Mantenimiento') return '#94a3b8';
    return swatchForColor(color);
  }


  ngOnDestroy(): void {
    if (this.addAnimTimeout) clearTimeout(this.addAnimTimeout);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  // ——— Ink grouping helpers
  private containsWord(haystack: string, token: string): boolean {
    return new RegExp(`\\b${token}\\b`).test(haystack);
  }

  private extractModelTokens(haystack: string): string[] {
    const matches = haystack.match(/\b(?:f|g|t)\d{3,5}[a-z]?\b/g) ?? [];
    return Array.from(new Set(matches));
  }

  private inkFamilyKey(p?: Product | null): string | null {
    if (!p) return null;
    const text = productInkModelHaystack(p);
    if (!text) return null;

    // Misma lógica de familias del catálogo: 1 familia = 1 tarjeta.
    if (this.containsWord(text, 'f170') || this.containsWord(text, 'f570')) return 'f170-f570';
    if (this.containsWord(text, 'f6200')) return 'f6200';
    if (this.containsWord(text, 'f6370')) return 'f6370';
    if (this.containsWord(text, 'f6470') || this.containsWord(text, 'f6470h')) return 'f6470-f6470h';
    if (this.containsWord(text, 'g6070')) return 'g6070';

    const tokens = this.extractModelTokens(text);
    if (tokens.length) return tokens.sort().join('+');
    return null;
  }

  private listAllProductsBySubcategory(subcategoryId: number) {
    return this.subcategoryService.getProductsBySubcategory(subcategoryId, { page: 1, pageSize: 40 }).pipe(
      switchMap((first) => {
        const firstItems = first.data ?? [];
        const totalPages = Math.max(1, Number(first.meta?.totalPages ?? 1));
        if (totalPages <= 1) return of(firstItems);

        const requests = Array.from({ length: totalPages - 1 }, (_, idx) =>
          this.subcategoryService.getProductsBySubcategory(subcategoryId, { page: idx + 2, pageSize: 40 })
        );
        return forkJoin(requests).pipe(
          map((pages) => [...firstItems, ...pages.flatMap((pg) => pg.data ?? [])])
        );
      })
    );
  }

  private loadInkVariants(p?: Product | null) {
    if (!p || !isInkSubcategoryStrict(p)) { this.inkVariants.set([]); return; }

    const familyKey = this.inkFamilyKey(p);
    if (!familyKey) { this.inkVariants.set([]); return; }

    this.productService.getRelatedProducts(p.id, 24)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const relatedPool: Product[] = [p, ...(items || [])].filter((x): x is Product => !!x);
          const relatedVariants = relatedPool
            .filter((x) => isInkSubcategory(x) && this.inkFamilyKey(x) === familyKey)
            .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i)
            .sort((a, b) => colorOrder(a) - colorOrder(b));

          // Si related no trae suficientes colores, usamos toda la subcategoría para completar variantes.
          if (relatedVariants.length >= 2) {
            this.inkVariants.set(relatedVariants);
            this.refreshSelectedColor(p);
            return;
          }

          const subcategoryId = Number((p as any)?.subcategory?.id ?? (p as any)?.subcategoryId ?? 0);
          if (!subcategoryId) {
            this.inkVariants.set(relatedVariants);
            this.refreshSelectedColor(p);
            return;
          }

          this.listAllProductsBySubcategory(subcategoryId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (all) => {
                const fullPool: Product[] = [p, ...all].filter((x): x is Product => !!x);
                const variants = fullPool
                  .filter((x) => isInkSubcategory(x) && this.inkFamilyKey(x) === familyKey)
                  .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i)
                  .sort((a, b) => colorOrder(a) - colorOrder(b));
                this.inkVariants.set(variants);
                this.refreshSelectedColor(p);
              },
              error: () => {
                this.inkVariants.set(relatedVariants);
                this.refreshSelectedColor(p);
              }
            });
        },
        error: () => this.inkVariants.set([])
      });
  }

  private refreshSelectedColor(current?: Product | null) {
    const colors = this.availableColors();
    const detected = current ? this.inkVariantLabel(current) : null;
    if (detected && colors.includes(detected)) {
      this.selectedColor.set(detected);
      return;
    }
    if (!colors.includes(this.selectedColor() || '')) {
      this.selectedColor.set(colors[0] ?? null);
    }
  }

  getColorInitials(color: string): string {
    const initials: Record<string, string> = {
      'Cyan': 'C',
      'Magenta': 'M',
      'Yellow': 'Y',
      'Black': 'K',
      'Fluor Yellow': 'FY',
      'Fluor Pink': 'FP',
      'Mantenimiento': 'ML',
      'Light Cyan': 'LC',
      'Light Magenta': 'LM',
      'Cian': 'C',
      'Amarillo': 'Y',
      'Negro': 'HDK',
      'Blanco': 'WH',
      'Rojo': 'R',
      'Azul': 'Az',
      'Verde': 'V',
      'Naranja': 'Na',
      'Violeta': 'Vi',
      'Rosa': 'Ro'
    };

    return initials[color] || color.substring(0, 2).toUpperCase();
  }

  isLightColor(hex: string): boolean {
    // Colores claros que necesitan texto oscuro
    const lightColors = ['#f8fafc', '#fef3c7', '#fef08a', '#fef9c3', '#ffffff', '#fecaca', '#fee2e2'];
    return lightColors.includes(hex.toLowerCase());
  }

}
