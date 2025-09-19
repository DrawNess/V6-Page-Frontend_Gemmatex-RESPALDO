import { Component, Input, SimpleChanges, inject, signal, ElementRef, ViewChild , computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkWithHref } from '@angular/router';
import { ProductComponent } from '@products/components/product/product.component';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { Category } from '@shared/models/category.model';

type SubFilter = { label: string; keys: string[] };

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, ProductComponent, RouterLinkWithHref],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  @Input() category_id?: string;

  // Hero
  heroUrl = 'https://iili.io/Fy4LpkP.jpg';
  heroAlt = 'Fondo de impresión y sublimación';

  // ===== Ruleta =====
  @ViewChild('rouletteTrack', { static: false }) rouletteTrack?: ElementRef<HTMLDivElement>;
  private rouletteTimer: any = null;
  private rouletteIntervalMs = 2200;

  ngOnInit() { this.getCategories(); }
  ngOnChanges(_: SimpleChanges) { this.getProducts(); }
  ngAfterViewInit() { setTimeout(() => this.rouletteResume(), 0); }
  ngOnDestroy() { this.roulettePause(); }

  addToCart(product: Product) { this.cartService.addToCart(product); }

  private getProducts() {
    this.productService.getProducts(this.category_id).subscribe({
      next: (products) => this.products.set(products),
      error: () => {}
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

  trackById = (_: number, p: Product) => p.id;
  onCatImgError(e: Event) { (e.target as HTMLImageElement).src = '/assets/placeholders/category.webp'; }

  /* ---------------------- BUSCADOR + CATEGORÍAS ---------------------- */
  search = signal('');
  selectedCats = signal<Set<number>>(new Set<number>());

  searchFilteredProducts = computed<Product[]>(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p => {
      const haystack = [
        p.name,
        (p as any).shortDescription,
        (p as any).description,
        ...(p.tags ?? []),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  categoryCounts = computed<Map<number, number>>(() => {
    const map = new Map<number, number>();
    for (const p of this.searchFilteredProducts()) {
      const cid = Number((p as any).category);
      map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  });

  /* ------------------ SUBCATEGORÍAS (definidas por ustedes) ------------------ */
  // Ajusta los "keys" para que coincidan con product.subcategory (lowercase).
  readonly SUB_FILTERS: SubFilter[] = [
    { label: 'Impresora de sublimación',              keys: ['sublimacion','impresora_sublimacion','sublimation'] },
    { label: 'Impresora DTF',                         keys: ['dtf','impresora_dtf'] },
    { label: 'Impresora de Gráficos Técnicos CAD',    keys: ['cad','graficos_tecnicos','cad_tech'] },
    { label: 'Impresora de Etiquetas',                keys: ['etiquetas','label','impresora_etiquetas'] },
    { label: 'Puntos de venta',                       keys: ['pos','puntos_de_venta'] },
    { label: 'Equipos Especializados',                keys: ['especializados','specialized'] },
  ];

  activeSub = signal<string | null>(null); // guarda el label activo

  applySub(label: string) {
    this.activeSub.set(this.activeSub() === label ? null : label);
  }
  isActive(label: string) { return this.activeSub() === label; }

  // productos filtrados finales (texto + categorías + subcategoría manual)
  filteredProducts = computed<Product[]>(() => {
    const termFiltered = this.searchFilteredProducts();
    const cats = this.selectedCats();
    const active = this.activeSub();
    const subMap = new Map(this.SUB_FILTERS.map(f => [f.label, f.keys]));

    return termFiltered.filter(p => {
      // filtro por categoría (si hay seleccionadas)
      const matchCat = !cats.size || cats.has(Number((p as any).category));

      // filtro por subcategoría manual
      const sub = (p as any).subcategory ? String((p as any).subcategory).toLowerCase() : '';
      const keys = active ? (subMap.get(active) ?? []) : [];
      const matchSub = !active || keys.some(k => sub === k || sub.includes(k));

      return matchCat && matchSub;
    });
  });

  // handlers existentes
  onSearch(ev: Event) {
    const val = (ev.target as HTMLInputElement)?.value ?? '';
    this.search.set(val);
  }
  clearSearch() { this.search.set(''); }
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
}
