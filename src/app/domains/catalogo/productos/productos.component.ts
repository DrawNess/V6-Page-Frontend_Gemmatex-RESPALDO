import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { Product } from '@shared/models/product.model';
import { ProductService, PaginationMeta } from '@shared/services/product.service';
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
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // estado
  products = signal<Product[]>([]);
  subcategories = signal<Subcategory[]>([]);
  currentCategory = signal<string | null>(null);
  currentCategoryId = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  meta = signal<PaginationMeta | null>(null);
  page = signal(1);
  readonly pageSize = 40;

  // filtros
  search = signal('');
  selectedSubs = signal<Set<number>>(new Set<number>());
  private initialSubId: number | null = null;

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      const categoryId = qp.get('categoryId');
      const subcategoryId = qp.get('subcategoryId');
      const q = (qp.get('q') || '').trim();

      this.currentCategoryId.set(categoryId);
      this.search.set(q);
      this.initialSubId = subcategoryId ? Number(subcategoryId) : null;
      this.page.set(1);
      this.selectedSubs.set(new Set());
      this.products.set([]);
      this.subcategories.set([]);
      this.meta.set(null);

      this.loadCategoryData(categoryId);
      this.fetchProducts();
    });
  }

  private loadCategoryData(categoryId: string | null) {
    if (!categoryId) {
      this.currentCategory.set('Todas las categorías');
      return;
    }

    this.subcategoryService.getByCategory(categoryId).subscribe({
      next: (subs) => {
        this.subcategories.set(subs ?? []);
        this.applyInitialSub();
      },
      error: () => this.subcategories.set([])
    });

    this.categoryService.getOne(categoryId).subscribe({
      next: (cat) => this.currentCategory.set(cat?.name ?? null),
      error: () => this.currentCategory.set(null)
    });
  }

  private fetchProducts() {
    this.loading.set(true);
    this.error.set(null);

    const q = this.search().trim();
    const categoryId = this.currentCategoryId();
    const req$ = q
      ? this.productService.searchProductsByTerm(q, {
          page: this.page(),
          pageSize: this.pageSize
        })
      : this.productService.listProducts({
          categoryId: categoryId ?? undefined,
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
        this.error.set('No se pudo cargar productos');
      },
      complete: () => this.loading.set(false)
    });
  }

  private applyInitialSub() {
    if (this.initialSubId && this.subcategories().some(s => s.id === this.initialSubId)) {
      this.selectedSubs.set(new Set([this.initialSubId]));
    }
  }

  private productSubId(p: Product): number | null {
    return Number((p as any).subcategoryId ?? (p as any).subcategory?.id ?? NaN) || null;
  }

  filteredProducts = computed(() => {
    const subSet = this.selectedSubs();
    return this.products().filter((p) => {
      const subId = this.productSubId(p);
      return !subSet.size ? true : subId !== null && subSet.has(subId);
    });
  });

  isInkCategory = computed(() => {
    if (this.subcategories().some(s => (s.name || '').toLowerCase().includes('tinta'))) return true;
    const prods = this.products();
    if (!prods.length) return false;
    const inkCount = prods.filter(p => isInkSubcategory(p)).length;
    return inkCount / prods.length >= 0.5;
  });

  groupedProducts = computed(() => {
    const list = this.filteredProducts();
    if (!this.isInkCategory()) return list;

    const groups = new Map<string, Product[]>();
    for (const p of list) {
      if (!isInkSubcategory(p)) {
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

  subCounts = computed<Map<number, number>>(() => {
    const map = new Map<number, number>();
    for (const s of this.subcategories()) map.set(s.id, 0);
    for (const p of this.products()) {
      const sid = this.productSubId(p);
      if (sid !== null && map.has(sid)) map.set(sid, (map.get(sid) ?? 0) + 1);
    }
    return map;
  });

  onSearch(ev: Event) {
    const val = (ev.target as HTMLInputElement)?.value ?? '';
    this.search.set(val);
    this.page.set(1);

    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.fetchProducts(), 300);
  }

  clearSearch() {
    this.search.set('');
    this.page.set(1);
    this.fetchProducts();
  }

  toggleSub(id: number) {
    this.selectedSubs.update((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isSubActive = (id: number) => this.selectedSubs().has(id);
  clearSubs() { this.selectedSubs.set(new Set()); }

  prevPage() {
    const meta = this.meta();
    if (!meta?.hasPrevPage) return;
    this.page.set(meta.prevPage ?? Math.max(1, this.page() - 1));
    this.fetchProducts();
  }

  nextPage() {
    const meta = this.meta();
    if (!meta?.hasNextPage) return;
    this.page.set(meta.nextPage ?? this.page() + 1);
    this.fetchProducts();
  }

  trackByProduct = (_: number, p: Product) => p.id;
  trackBySub = (_: number, s: Subcategory) => s.id;
}
