import { Component, Input, SimpleChanges, inject, signal, ElementRef, ViewChild , computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkWithHref } from '@angular/router';
import { ProductComponent } from '@products/components/product/product.component';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { Category } from '@shared/models/category.model';

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
  
    ngOnInit() {
      this.getCategories();
    }
  
    ngOnChanges(_: SimpleChanges) {
      this.getProducts();
    }
  
    ngAfterViewInit() {
      // arranca auto-scroll cuando ya existe el track
      setTimeout(() => this.rouletteResume(), 0);
    }
  
    ngOnDestroy() {
      this.roulettePause();
    }
  
    addToCart(product: Product) {
      this.cartService.addToCart(product)
    }
  
    private getProducts() {
      this.productService.getProducts(this.category_id)
        .subscribe({
          next: (products) => this.products.set(products),
          error: () => {}
        });
    }
  
    private getCategories() {
      this.categoryService.getAll()
        .subscribe({
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
  
    roulettePause() {
      if (this.rouletteTimer) { clearInterval(this.rouletteTimer); this.rouletteTimer = null; }
    }
    rouletteResume() {
      this.roulettePause();
      this.rouletteTimer = setInterval(this.tick, this.rouletteIntervalMs);
    }
    scrollLeft() {
      this.roulettePause();
      this.rouletteTrack?.nativeElement.scrollBy({ left: -this.step(), behavior: 'smooth' });
    }
    scrollRight() {
      this.roulettePause();
      this.rouletteTrack?.nativeElement.scrollBy({ left:  this.step(), behavior: 'smooth' });
    }
  
    // trackBy (lo sigues usando en el grid)
    trackById = (_: number, p: Product) => p.id;
    onCatImgError(e: Event) {
      const el = e.target as HTMLImageElement;
      el.src = '/assets/placeholders/category.webp'; // tu placeholder
    }

    /* -------------------------------------- */
    // --- búsqueda ---
search = signal('');

// categorías seleccionadas (IDs)
selectedCats = signal<Set<number>>(new Set<number>());

// productos filtrados solo por búsqueda (para calcular contadores por categoría)
searchFilteredProducts = computed<Product[]>(() => {
  const q = this.search().trim().toLowerCase();
  if (!q) return this.products();

  return this.products().filter(p => {
    const haystack = [
      p.name,
      p.shortDescription,
      p.description,
      ...(p.tags ?? []),
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(q);
  });
});

// conteo por categoría (en función de la búsqueda, NO del filtro de categorías)
categoryCounts = computed<Map<number, number>>(() => {
  const map = new Map<number, number>();
  for (const p of this.searchFilteredProducts()) {
    const cid = Number((p as any).category);
    map.set(cid, (map.get(cid) ?? 0) + 1);
  }
  return map;
});

// productos filtrados finales (búsqueda + categorías)
filteredProducts = computed<Product[]>(() => {
  const set = this.selectedCats();
  const fromSearch = this.searchFilteredProducts();

  if (!set.size) return fromSearch;
  return fromSearch.filter(p => set.has(Number((p as any).category)));
});

// handlers
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

clearFilters() { this.clearSearch(); this.clearCategories(); }
}
