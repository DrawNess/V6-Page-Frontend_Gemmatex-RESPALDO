import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { Product } from '@shared/models/product.model';
import { ProductService, PaginationMeta } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { ProductComponent } from '@products/components/product/product.component';
import { SubcategoryService } from '@shared/services/subcategory.service';
import { Subcategory } from '@shared/models/subcategory.model';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { groupEpsonInkProducts } from '@shared/utils/ink-grouping.util';

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
  private subProductsCache = new Map<number, Product[]>();

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
  subCounts = signal<Map<number, number>>(new Map<number, number>());

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      const categoryId = qp.get('categoryId');
      const subcategoryId = qp.get('subcategoryId');
      const q = (qp.get('q') || '').trim();

      this.currentCategoryId.set(categoryId);
      this.search.set(q);
      this.selectedSubs.set(subcategoryId ? new Set([Number(subcategoryId)]) : new Set());
      this.subProductsCache.clear();
      this.page.set(1);
      this.products.set([]);
      this.subcategories.set([]);
      this.subCounts.set(new Map());
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
        this.loadSubCounts();

        const allowed = new Set((subs ?? []).map((s) => s.id));
        const current = this.selectedSubs();
        const next = new Set<number>([...current].filter((id) => allowed.has(id)));
        if (next.size !== current.size) {
          this.selectedSubs.set(next);
          this.page.set(1);
          this.fetchProducts();
        }
      },
      error: () => {
        this.subcategories.set([]);
        this.subCounts.set(new Map());
      }
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
    const selectedSubIds = [...this.selectedSubs()];
    const req$ = selectedSubIds.length
      ? this.listProductsBySelectedSubs(selectedSubIds, q)
      : q
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
        if (this.page() !== (res.meta?.page ?? this.page())) {
          this.page.set(res.meta?.page ?? this.page());
        }
      },
      error: () => {
        this.products.set([]);
        this.meta.set(null);
        this.error.set('No se pudo cargar productos');
      },
      complete: () => this.loading.set(false)
    });
  }

  private loadSubCounts() {
    const subs = this.subcategories();
    if (!subs.length) {
      this.subCounts.set(new Map());
      return;
    }

    const requests = subs.map((s) =>
      this.subcategoryService.getProductsBySubcategory(s.id, { page: 1, pageSize: 1 }).pipe(
        map((res) => [s.id, Number(res.meta?.totalItems ?? res.data?.length ?? 0)] as const),
        catchError(() => of([s.id, 0] as const))
      )
    );

    forkJoin(requests).subscribe((entries) => {
      this.subCounts.set(new Map<number, number>(entries));
    });
  }

  private getAllProductsBySubcategory(id: number): Observable<Product[]> {
    const cached = this.subProductsCache.get(id);
    if (cached) return of(cached);

    return this.subcategoryService.getProductsBySubcategory(id, {
      page: 1,
      pageSize: this.pageSize
    }).pipe(
      switchMap((first) => {
        const firstItems = first.data ?? [];
        const totalPages = Math.max(1, Number(first.meta?.totalPages ?? 1));
        if (totalPages <= 1) return of(firstItems);

        const requests: Observable<{ data: Product[] }>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          requests.push(
            this.subcategoryService.getProductsBySubcategory(id, {
              page: p,
              pageSize: this.pageSize
            })
          );
        }

        return forkJoin(requests).pipe(
          map((pages) => {
            const rest = pages.flatMap((pg) => pg.data ?? []);
            return [...firstItems, ...rest];
          })
        );
      }),
      map((all) => {
        this.subProductsCache.set(id, all);
        return all;
      }),
      catchError(() => of([]))
    );
  }

  private listProductsBySelectedSubs(
    ids: number[],
    term: string
  ): Observable<{ data: Product[]; meta: PaginationMeta }> {
    const requests = ids.map((id) => this.getAllProductsBySubcategory(id));
    return forkJoin(requests).pipe(
      map((groups) => {
        const unique = new Map<number, Product>();
        for (const list of groups) {
          for (const p of list) {
            unique.set(p.id, p);
          }
        }

        let merged = Array.from(unique.values());
        const q = term.trim().toLowerCase();
        if (q) {
          merged = merged.filter((p) => this.matchesTerm(p, q));
        }
        const grouped = groupEpsonInkProducts(merged);
        grouped.sort((a, b) => Number(a.id) - Number(b.id));

        const totalItems = grouped.length;
        const pageSize = this.pageSize;
        const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;
        const safePage = totalPages > 0
          ? Math.min(this.page(), totalPages)
          : 1;
        const start = (safePage - 1) * pageSize;
        const data = grouped.slice(start, start + pageSize);

        return {
          data,
          meta: {
            totalItems,
            itemCount: data.length,
            page: safePage,
            pageSize,
            totalPages,
            hasNextPage: totalPages > 0 && safePage < totalPages,
            hasPrevPage: totalPages > 0 && safePage > 1,
            nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null,
            prevPage: totalPages > 0 && safePage > 1 ? safePage - 1 : null
          }
        };
      })
    );
  }

  private matchesTerm(p: Product, q: string): boolean {
    const parts: string[] = [
      p.name ?? '',
      (p as any).description ?? '',
      (p as any).shortDescription ?? '',
      (p as any).brand ?? '',
      (p as any).subcategory?.name ?? '',
      (p as any).category?.name ?? ''
    ];
    const tags = ((p as any).tags ?? []) as string[];
    const haystack = [...parts, ...tags].join(' ').toLowerCase();
    return haystack.includes(q);
  }

  groupedProducts = computed(() => {
    return this.products();
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
    this.page.set(1);
    this.fetchProducts();
  }

  isSubActive = (id: number) => this.selectedSubs().has(id);
  clearSubs() {
    this.selectedSubs.set(new Set<number>());
    this.page.set(1);
    this.fetchProducts();
  }

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
