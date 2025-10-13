import { Component, inject, signal, effect, computed  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { Product } from '@shared/models/product.model';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { ProductComponent } from '@products/components/product/product.component';
import { SubcategoryService } from '@shared/services/subcategory.service';
import { Subcategory } from '@shared/models/subcategory.model';

@Component({
  selector: 'app-productos',
  standalone: true,
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
  loading = signal(false);
  error = signal<string | null>(null);

  // filtros
  search = signal('');
  selectedSubs = signal<Set<number>>(new Set<number>());

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      const categoryId = qp.get('categoryId');
      this.load(categoryId);
    });
  }

  private load(categoryId: string | null) {
    this.loading.set(true);
    this.error.set(null);
    this.products.set([]);
    this.subcategories.set([]);
    this.selectedSubs.set(new Set());

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
          next: (subs) => this.subcategories.set(subs ?? []),
          error: () => this.subcategories.set([]),
          complete: () => this.loading.set(false),
        });
    } else {
      // fallback: todos los productos (sin subcategorías)
      this.productService.getProductos().subscribe({
        next: (items) => this.products.set(items ?? []),
        error: () => this.error.set('No se pudo cargar productos'),
        complete: () => this.loading.set(false),
      });
    }
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

      const bySub = !subSet.size
        ? true
        : subSet.has(Number((p as any).subcategoryId));

      return byText && bySub;
    });
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
      const sid = Number((p as any).subcategoryId);
      if (map.has(sid)) map.set(sid, (map.get(sid) ?? 0) + 1);
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
