import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { Product } from '@shared/models/product.model';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { ProductComponent } from '@products/components/product/product.component';
import { SubcategoryService } from '@shared/services/subcategory.service';
import { Subcategory } from '@shared/models/subcategory.model';
import {
  cleanInkName,
  colorOrder,
  inkBaseKey,
  isInkSubcategory
} from '@shared/utils/ink-utils';

@Component({
    selector: 'app-productos',
    imports: [CommonModule, ProductComponent],
    templateUrl: './productos.component.html',
    styleUrl: './productos.component.css'
})

export class ProductosComponent {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private subcategoryService = inject(SubcategoryService);

  // estado
  products = signal<Product[]>([]);
  subcategories = signal<Subcategory[]>([]);
  currentCategory = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // filtros
  search = signal('');
  selectedSubs = signal<Set<number>>(new Set<number>());
  private initialSubId: number | null = null;

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      const categoryId = qp.get('categoryId');
      const subcategoryId = qp.get('subcategoryId');
      const q = (qp.get('q') || '').trim();
      this.search.set(q);
      this.initialSubId = subcategoryId ? Number(subcategoryId) : null;
      this.load(categoryId);
    });
  }

  private load(categoryId: string | null) {
    this.loading.set(true);
    this.error.set(null);
    this.products.set([]);
    this.subcategories.set([]);
    this.selectedSubs.set(new Set());
    this.currentCategory.set(null);

    if (categoryId) {
      // Productos de la categoría
      this.categoryService
        .getProductsByCategory(categoryId)
        .subscribe({
          next: (items) => this.products.set(items ?? []),
          error: () => this.error.set('No se pudo cargar productos'),
        });

      // Subcategorías de la categoría
      this.subcategoryService
        .getByCategory(categoryId)
        .subscribe({
          next: (subs) => {
            this.subcategories.set(subs ?? []);
            this.applyInitialSub();
          },
          error: () => this.subcategories.set([]),
          complete: () => this.loading.set(false),
        });

      // Nombre de categoría
      this.categoryService.getOne(categoryId).subscribe({
        next: (cat) => this.currentCategory.set(cat?.name ?? null),
        error: () => this.currentCategory.set(null)
      });
    } else {
      // fallback: todos los productos (sin subcategorías)
      this.productService.getProductos().subscribe({
        next: (items) => this.products.set(items ?? []),
        error: () => this.error.set('No se pudo cargar productos'),
        complete: () => this.loading.set(false),
      });
      this.applyInitialSub();
      this.currentCategory.set('Todas las categorías');
    }
  }

  private applyInitialSub() {
    if (this.initialSubId && this.subcategories().some(s => s.id === this.initialSubId)) {
      this.selectedSubs.set(new Set([this.initialSubId]));
    }
  }

  private productSubId(p: Product): number | null {
    return Number((p as any).subcategoryId ?? (p as any).subcategory?.id ?? NaN) || null;
  }

  // filtro combinado
  filteredProducts = computed(() => {
    const txt = this.search().trim().toLowerCase();
    const subSet = this.selectedSubs();

    return this.products().filter((p) => {
      const byText = !txt
        ? true
        : [
            p.name,
            (p as any).shortDescription,
            (p as any).description,
            ...(p.tags ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(txt);

      const subId = this.productSubId(p);
      const bySub = !subSet.size
        ? true
        : subId !== null && subSet.has(subId);

      return byText && bySub;
    });
  });

  // Categoria tinta heurística: si el nombre de la categoría o subcategorías incluye "tinta", o si al menos la mitad de los productos parecen ser tintas según su subcategoría
  isInkCategory = computed(() => {
    if (this.subcategories().some(s => (s.name || '').toLowerCase().includes('tinta'))) return true;
    const prods = this.products();
    if (!prods.length) return false;
    const inkCount = prods.filter(p => isInkSubcategory(p)).length;
    return inkCount / prods.length >= 0.5;
  });

  // Agrupación por modelo base (muestra un representante por colorway)
  groupedProducts = computed(() => {
    const list = this.filteredProducts();
    if (!this.isInkCategory()) return list;

    const groups = new Map<string, Product[]>();
    for (const p of list) {
      if (!isInkSubcategory(p)) {
        // elementos no tinta se muestran normales
        groups.set(`other-${p.id}`, [p]);
        continue;
      }
      const key = inkBaseKey(p) ?? `ink-${p.id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    const reps: Product[] = [];
    for (const [, items] of groups.entries()) {
      items.sort((a, b) => colorOrder(a) - colorOrder(b));
      const rep = items[0];
      reps.push({
        ...rep,
        name: cleanInkName(rep),
      });
    }
    return reps;
  });

  // counts por subcategoría (sobre búsqueda actual)
  subCounts = computed<Map<number, number>>(() => {
    const map = new Map<number, number>();
    for (const s of this.subcategories()) map.set(s.id, 0);
    for (const p of this.products()) {
      const txt = this.search().trim().toLowerCase();
      const byText = !txt
        ? true
        : [
            p.name,
            (p as any).shortDescription,
            (p as any).description,
            ...(p.tags ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(txt);
      if (!byText) continue;
      const sid = this.productSubId(p);
      if (sid !== null && map.has(sid)) map.set(sid, (map.get(sid) ?? 0) + 1);
    }
    return map;
  });

  // UI handlers
  onSearch(ev: Event) {
    const val = (ev.target as HTMLInputElement)?.value ?? '';
    this.search.set(val);
  }
  clearSearch() { this.search.set(''); }

  toggleSub(id: number) {
    this.selectedSubs.update((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  isSubActive = (id: number) => this.selectedSubs().has(id);
  clearSubs() { this.selectedSubs.set(new Set()); }

  trackByProduct = (_: number, p: Product) => p.id;
  trackBySub = (_: number, s: Subcategory) => s.id;
}
