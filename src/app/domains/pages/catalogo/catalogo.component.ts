import { Component, Input, SimpleChanges, inject, signal, ElementRef, ViewChild , computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductComponent } from '@products/components/product/product.component';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { PaginationMeta, ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { Category } from '@shared/models/category.model';

type SubFilter = { label: string; keys: string[] };
// claves internas normalizadas
type GxKey = 'especial' | 'pequeno' | 'grande';
type BrandKey = 'epson' | 'gx';
type PdfDoc = { file: string; title?: string };


@Component({
    selector: 'app-catalogo',
    imports: [CommonModule, ProductComponent],
    templateUrl: './catalogo.component.html',
    styleUrl: './catalogo.component.css'
})
export class CatalogoComponent {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  private route = inject(ActivatedRoute);
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  @Input() category_id?: string;

  // Hero
  heroUrl = 'https://iili.io/Fy4LpkP.jpg';
  heroAlt = 'Fondo de impresión y sublimación';

  // ===== Ruleta =====
  @ViewChild('rouletteTrack', { static: false }) rouletteTrack?: ElementRef<HTMLDivElement>;
  private rouletteTimer: any = null;
  private rouletteIntervalMs = 2200;

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      const q = (qp.get('q') || '').trim();
      const catId = qp.get('categoryId');
      this.search.set(q);
      this.selectedCats.set(catId ? new Set([Number(catId)]) : new Set());
      this.page.set(1);
      this.getProducts();
    });
    this.getCategories();
  }
  ngOnChanges(_: SimpleChanges) {
    this.page.set(1);
    this.getProducts();
  }
  ngAfterViewInit() { setTimeout(() => this.rouletteResume(), 0); }
  ngOnDestroy() { this.roulettePause(); }

  addToCart(product: Product) { this.cartService.addToCart(product); }

  private getProducts() {
    this.loading.set(true);

    const q = this.search().trim();
    const req$ = q
      ? this.productService.searchProductsByTerm(q, {
          page: this.page(),
          pageSize: this.pageSize
        })
      : this.productService.listProducts({
          categoryId: this.category_id,
          page: this.page(),
          pageSize: this.pageSize
        });

    req$.subscribe({
      next: (res) => {
        this.products.set(res.data ?? []);
        this.meta.set(res.meta ?? null);
      },
      error: () => {
        this.products.set([]);
        this.meta.set(null);
      },
      complete: () => this.loading.set(false)
    });
  }
  private getCategories() {
    this.categoryService.getAll().subscribe({
      next: (data) => this.categories.set(data),
      error: () => {}
    });
  }

  // ===== Lógica de ruleta =====
  private step() {
    const el = this.rouletteTrack?.nativeElement;
    if (!el) return 240;
    return Math.max(160, Math.floor(el.clientWidth / 2));
  }
  private tick = () => {
    const el = this.rouletteTrack?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 1;
    const next = el.scrollLeft + this.step();
    if (next >= max) {
      el.scrollTo({ left: 0, behavior: 'auto' });
    } else {
      el.scrollBy({ left: this.step(), behavior: 'smooth' });
    }
  };
  roulettePause() { if (this.rouletteTimer) { clearInterval(this.rouletteTimer); this.rouletteTimer = null; } }
  rouletteResume() { this.roulettePause(); this.rouletteTimer = setInterval(this.tick, this.rouletteIntervalMs); }
  scrollLeft() { this.roulettePause(); this.rouletteTrack?.nativeElement.scrollBy({ left: -this.step(), behavior: 'smooth' }); }
  scrollRight() { this.roulettePause(); this.rouletteTrack?.nativeElement.scrollBy({ left:  this.step(), behavior: 'smooth' }); }

  /* trackById = (_: number, p: Product) => p.id; */
  trackById(index: number, item: Product) {
    return item.id;
  }
  onCatImgError(e: Event) { (e.target as HTMLImageElement).src = '/assets/placeholders/category.svg'; }

  /* ---------------------- BUSCADOR + CATEGORÍAS ---------------------- */
  search = signal('');
  loading = signal(false);
  meta = signal<PaginationMeta | null>(null);
  page = signal(1);
  readonly pageSize = 40;
  selectedCats = signal<Set<number>>(new Set<number>());

  searchFilteredProducts = computed<Product[]>(() => {
    return this.products();
  });

  categoryCounts = computed<Map<number, number>>(() => {
    const map = new Map<number, number>();
    for (const p of this.searchFilteredProducts()) {
      const cid = Number((p as any).category);
      map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  });

  /* ------------------ SUBCATEGORÍAS ------------------ */
  // keys para la categoria epson.
  readonly SUB_FILTERS: SubFilter[] = [
    { label: 'Impresora de sublimación',              keys: ['sublimacion','impresora_sublimacion','sublimation'] },
    { label: 'Impresora DTF',                         keys: ['dtf','impresora_dtf'] },
    { label: 'Impresora de Gráficos Técnicos CAD',    keys: ['cad','graficos_tecnicos','cad_tech'] },
    { label: 'Impresora de Etiquetas',                keys: ['etiquetas','label','impresora_etiquetas'] },
    { label: 'Puntos de venta',                       keys: ['puntos de venta'] },
    { label: 'Equipos Especializados',                keys: ['especializados','specialized'] },
  ];

  activeSub = signal<string | null>(null); // guarda el label activo

  applySub(label: string) {
    this.activeSub.set(this.activeSub() === label ? null : label);
  }
  isActive(label: string) {
    return this.activeSub() === label;
  }




  // productos filtrados finales (texto + categorías + subcategoría manual)
filteredProducts = computed<Product[]>(() => {
  const termFiltered = this.searchFilteredProducts();
  const cats = this.selectedCats();

  const eActive = this.activeSub();          // EPSON: un label (o null)
  const gxSet = this.activeGx()             // GX: set de labels activos

  return termFiltered.filter(p => {
    // (1) Categorías API
    const matchCat = !cats.size || cats.has(Number((p as any).category));

    // (2) EPSON
    let epsonOk = false;
    if (eActive) {
      const keys = this.SUB_FILTERS.find(f => f.label === eActive)?.keys ?? [];
      epsonOk = this.isEPSON(p) && keys.some(k => this.matchEpsonKey(p, k));
    }

    // (3) GX
    let gxOk = false;
    if (gxSet.size) {
      if (this.isGX(p)) {
        const anyLabelMatches = [...gxSet].some(lbl => {
          const keys = this.GX_SUB_FILTERS.find(f => f.label === lbl)?.keys ?? [];
          return keys.some(k => this.matchGxKey(p, k));
        });
        gxOk = anyLabelMatches;
      }
    }

    // (4) Si no hay filtros de marca activos, pasa
    const brandFilterActive = !!eActive || gxSet.size > 0;
    const matchBrand = brandFilterActive ? (epsonOk || gxOk) : true;

    return matchCat && matchBrand;
  });
});


  // handlers existentes
  onSearch(ev: Event) {
    const val = (ev.target as HTMLInputElement)?.value ?? '';
    this.search.set(val);
    this.page.set(1);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.getProducts(), 300);
  }
  clearSearch() {
    this.search.set('');
    this.page.set(1);
    this.getProducts();
  }
  toggleCat(id: number) {
    this.selectedCats.update(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  clearCategories() { this.selectedCats.set(new Set()); }
  clearFilters() {
    this.clearSearch();
    this.clearCategories();
    this.activeSub.set(null);
  }

  prevPage() {
    const m = this.meta();
    if (!m?.hasPrevPage) return;
    this.page.set(m.prevPage ?? Math.max(1, this.page() - 1));
    this.getProducts();
  }

  nextPage() {
    const m = this.meta();
    if (!m?.hasNextPage) return;
    this.page.set(m.nextPage ?? this.page() + 1);
    this.getProducts();
  }



// ---- Filtros GX -------------------------------------------------------------

// claves internas normalizadas
// (moved type GxKey outside the class)

// debajo de SUB_FILTERS (EPSON):
readonly GX_SUB_FILTERS: SubFilter[] = [
  { label: 'Plancha transfer – Formato Pequeño',   keys: ['pequeño','pequeno','pequeño','pequeno','small','38x38','40x50','peque']},
  { label: 'Plancha transfer – Formato Grande',    keys: ['formato grande','gran formato','big','grande','60x80','80x100']},
  { label: 'Plancha transfer – Especial',    keys: ['PLANCHA TRANSFER FORMATO GRANDE','especial']},
];
private matchGxKey(p: Product, key: string): boolean {
  const sub = (p as any).subcategory?.toString().toLowerCase?.() ?? '';
  if (sub && (sub === key || sub.includes(key))) return true;
  const t = this.haystack(p);
  return t.includes(key);
}
activeGx = signal<Set<string>>(new Set());

isGxActive(label: string) { return this.activeGx().has(label); }
/* CONTADOR PARA GX */
gxCounts = computed<Map<string, number>>(() => {
  const map = new Map<string, number>();
  for (const f of this.GX_SUB_FILTERS) map.set(f.label, 0);

  for (const p of this.searchFilteredProducts()) {
    if (!this.isGX(p)) continue;
    for (const f of this.GX_SUB_FILTERS) {
      if (f.keys.some(k => this.matchGxKey(p, k))) {
        map.set(f.label, (map.get(f.label) ?? 0) + 1);
        break;
      }
    }
  }
  return map;
});
// estado de selección (chips) para GX
/* selectedGxSubs = signal<Set<GxKey>>(new Set<GxKey>()); */
// Detecta si un producto es marca GX
private isGX = (p: Product): boolean => {
  const brand = (p as any).brand?.toString().toLowerCase?.() ?? '';
  const catName = (p as any).category?.name?.toString().toLowerCase?.() ??
                  (p as any).categoryName?.toString().toLowerCase?.() ?? '';
  const tags = ((p as any).tags ?? []).map((t: string) => t?.toLowerCase?.());
  return brand === 'gx' || catName === 'gx' || tags.includes('gx');
};
// extrae una subclave GX a partir de nombre/descr./tags
private gxSubKey = (p: Product): GxKey | null => {
  const text = [
    p.name, (p as any).shortDescription, (p as any).description,
    ...(((p as any).tags ?? []) as string[]),
  ].filter(Boolean).join(' ').toLowerCase();

  // reglas simples (puedes afinarlas)
  if (text.includes('especial')) return 'especial';
  if (text.includes('formato grande') || text.includes('gran formato')) return 'grande';
  if (text.includes('formato pequeño') || text.includes('formato pequeno') || text.includes('pequeño') || text.includes('pequeno')) return 'pequeno';

  // fallback por nombre típico “PLANCHA TRANSFER …”
  if (/transfer.+grande/.test(text)) return 'grande';
  if (/transfer.+peque/.test(text)) return 'pequeno';

  return null;
};
// ¿hay productos GX en el conjunto post-búsqueda?
hasGxProducts = computed<boolean>(() =>
  this.searchFilteredProducts().some(p => this.isGX(p))
);
// contadores por subclave GX (sobre el conjunto filtrado por búsqueda, como haces con las categorías)
gxSubCounts = computed<Map<GxKey, number>>(() => {
  const map = new Map<GxKey, number>([['especial',0],['pequeno',0],['grande',0]]);
  for (const p of this.searchFilteredProducts()) {
    if (!this.isGX(p)) continue;
    const key = this.gxSubKey(p);
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
});
  // handlers para chips GX
  /* toggleGx(key: GxKey) {
    this.selectedGxSubs.update(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  } */
/*   toggleGx(label: string) {
    const key = this.GX_SUB_FILTERS.find(f => f.label === label)?.keys[0] as GxKey | undefined;
    if (!key) return;
    this.selectedGxSubs.update(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  } */
 toggleGx(label: string) {
  this.activeGx.update(prev => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });
}

clearGx() {
  this.activeGx.set(new Set());
}


/*   applySub(label: string) {
    this.activeSub.set(this.activeSub() === label ? null : label);
  }
  isActive(label: string) { this.activeSub() === label ? null : label
  }
 */
  gxLabel(key: GxKey) {
    return key === 'especial' ? 'Especial'
        : key === 'grande'   ? 'Formato Grande'
        : 'Formato Pequeño';
  }








    /** Desplegable abierto (marca actual) */
  openBrand = signal<BrandKey | null>('epson');
  toggleBrand(k: BrandKey) { this.openBrand.set(this.openBrand() === k ? null : k); }

  /** ¿El producto es EPSON? (marca / categoría / tag) */
  private isEPSON(p: Product): boolean {
    const brand = (p as any).brand?.toString().toLowerCase?.() ?? '';
    const catName = (p as any).category?.name?.toString().toLowerCase?.() ??
                    (p as any).categoryName?.toString().toLowerCase?.() ?? '';
    const tags = ((p as any).tags ?? []).map((t: string) => t?.toLowerCase?.());
    return brand === 'epson' || catName === 'epson' || tags.includes('epson');
  }

  /** Texto de búsqueda/fallback por si no viene subcategory sólida */
  private haystack(p: Product): string {
    return [
      p.name, (p as any).shortDescription, (p as any).description,
      ...(((p as any).tags ?? []) as string[]),
      (p as any).subcategory,
    ].filter(Boolean).join(' ').toLowerCase();
  }

  /** ¿match de subcategoría EPSON con una key? */
  private matchEpsonKey(p: Product, key: string): boolean {
    const sub = (p as any).subcategory?.toString().toLowerCase?.() ?? '';
    if (sub && (sub === key || sub.includes(key))) return true;
    // fallback textual
    const t = this.haystack(p);
    return t.includes(key);
  }

  /** Conteos por label de SUB_FILTERS, en base a keys[] */
  epsonCounts = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const f of this.SUB_FILTERS) map.set(f.label, 0);

    for (const p of this.searchFilteredProducts()) {
      if (!this.isEPSON(p)) continue;
      for (const f of this.SUB_FILTERS) {
        if (f.keys.some(k => this.matchEpsonKey(p, k))) {
          map.set(f.label, (map.get(f.label) ?? 0) + 1);
          break; // 1er match por producto
        }
      }
    }
    return map;
  });

  /** Helper para la plantilla */
  countEpson(label: string) { return this.epsonCounts().get(label) ?? 0; }

  /** Limpiar solo EPSON */
  clearEpson() { this.activeSub.set(null); }






openDownloads = signal(false);
toggleDownloads() { this.openDownloads.set(!this.openDownloads()); }

readonly QUICK_PDFS: PdfDoc[] = [
  { file: 'CATALOGO_EPSON.pdf',                 title: 'Catálogo EPSON' },
  { file: 'CATALOGO_FREESUB.pdf',               title: 'Catálogo Freesub' },
  { file: 'CATALOGO_IMPRESORAS_DTF-UV.pdf',     title: 'Impresoras DTF / UV' },
  { file: 'CATALOGO_INSUMOS_SUBLIMACION.pdf',   title: 'Insumos de Sublimación' },
  { file: 'CATALOGO_MAQUINAS_GX.pdf',           title: 'Catálogo Máquinas GX' },
  { file: 'CATALOGO_PUBLICIDAD_VINILES.pdf',    title: 'Publicidad / Viniles' },
  { file: 'CATALOGO_SERIGRAFIA_QUITEXA.pdf',    title: 'Serigrafía Quitexa' },
  { file: 'CATALOGO_VINILES.pdf',               title: 'Catálogo Viniles' },
];

private readonly docsBase2 = 'assets/docs/';
docUrl2(d: PdfDoc) { return this.docsBase2 + d.file; }
docTitle2(d: PdfDoc) {
  return d.title ?? d.file
    .replace(/^CATALOGO[_-]?/i, 'Catálogo ')
    .replace(/[_-]+/g, ' ')
    .replace(/\.pdf$/i, '')
    .replace(/\b([a-záéíóúñ])/gi, m => m.toUpperCase());
}


}









