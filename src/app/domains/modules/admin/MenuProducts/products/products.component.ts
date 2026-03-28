import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { SubcategoryService } from '@shared/services/subcategory.service';
import { Product } from '@shared/models/product.model';
import { Category } from '@shared/models/category.model';
import { Subcategory } from '@shared/models/subcategory.model';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {
  private productSvc = inject(ProductService);
  private catSvc = inject(CategoryService);
  private subSvc = inject(SubcategoryService);
  private router = inject(Router);
  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  loading = signal(false);
  saving = signal(false);
  toast = signal<{ type: 'ok' | 'err'; msg: string } | null>(null);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  allSubcategories = signal<Subcategory[]>([]);
  subcategories = signal<Subcategory[]>([]);

  // Filters
  query = signal('');
  categoryFilter = signal('');
  subcategoryFilter = signal('');
  activeFilter = signal(false);

  // Modal
  modalOpen = signal(false);
  modalMode = signal<'create' | 'edit'>('create');
  form = signal<{ name: string; brand: string; imageUrl: string; subcategoryId: number | null }>({
    name: '', brand: '', imageUrl: '', subcategoryId: null
  });
  editId = signal<number | null>(null);

  // Bulk upload
  bulkOpen = signal(false);
  bulkFile = signal<File | null>(null);
  bulkDryRun = signal(true);
  bulkResult = signal<{ created?: number; updated?: number; errors?: unknown[] } | null>(null);
  bulkLoading = signal(false);

  // Delete
  deleteTarget = signal<Product | null>(null);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const catId = this.categoryFilter();
    const subId = this.subcategoryFilter();
    const onlyActive = this.activeFilter();

    return this.products().filter(p => {
      if (q) {
        const skus = (p.variants ?? []).map(v => v.sku?.toLowerCase()).join(' ');
        if (!p.name.toLowerCase().includes(q) && !skus.includes(q) && !p.brand?.toLowerCase().includes(q)) return false;
      }
      if (catId && String((p.subcategory as any)?.category?.id ?? (p.subcategory as any)?.categoryId ?? '') !== catId) return false;
      if (subId && String(p.subcategoryId ?? (p.subcategory as any)?.id ?? '') !== subId) return false;
      if (onlyActive && !p.is_active) return false;
      return true;
    });
  });

  ngOnInit() {
    this.loadCategories();
    this.loadAllSubcategories();
    this.loadProducts();
  }

  loadCategories() {
    this.catSvc.getAll().subscribe({ next: cats => this.categories.set(cats ?? []) });
  }

  loadAllSubcategories() {
    this.subSvc.getAll().subscribe({ next: subs => this.allSubcategories.set(subs ?? []) });
  }

  loadSubcategories() {
    const catId = this.categoryFilter();
    if (!catId) { this.subcategories.set([]); this.subcategoryFilter.set(''); return; }
    this.subSvc.getByCategory(catId).subscribe({ next: subs => this.subcategories.set(subs ?? []) });
  }

  loadProducts() {
    this.loading.set(true);
    const catId = this.categoryFilter();
    const obs = catId
      ? this.catSvc.getProductsByCategory(catId)
      : this.productSvc.getProductos();

    obs.subscribe({
      next: prods => { this.products.set(prods ?? []); this.loading.set(false); },
      error: () => { this.showToast('err', 'No se pudieron cargar los productos.'); this.loading.set(false); }
    });
  }

  onCategoryChange() {
    this.loadSubcategories();
    this.loadProducts();
  }

  // Product Modal
  openCreate() {
    this.modalMode.set('create');
    this.editId.set(null);
    this.form.set({ name: '', brand: '', imageUrl: '', subcategoryId: null });
    if (!this.allSubcategories().length) this.loadAllSubcategories();
    this.modalOpen.set(true);
  }

  openEdit(p: Product) {
    this.modalMode.set('edit');
    this.editId.set(p.id);
    const subId = p.subcategoryId ?? (p.subcategory as any)?.id ?? null;
    this.form.set({ name: p.name, brand: p.brand ?? '', imageUrl: p.imageUrl ?? '', subcategoryId: subId });
    if (!this.allSubcategories().length) this.loadAllSubcategories();
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  save() {
    const f = this.form();
    if (!f.name.trim()) { this.showToast('err', 'El nombre es obligatorio.'); return; }

    const payload: Record<string, unknown> = {
      name: f.name.trim(),
      brand: f.brand.trim(),
      imageUrl: f.imageUrl.trim()
    };
    if (f.subcategoryId) payload['subcategoryId'] = Number(f.subcategoryId);

    this.saving.set(true);

    if (this.modalMode() === 'create') {
      this.productSvc.createProduct(payload).subscribe({
        next: created => {
          this.products.update(list => [created, ...list]);
          this.showToast('ok', 'Producto creado.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo crear.'); this.saving.set(false); }
      });
    } else {
      const id = this.editId()!;
      this.productSvc.patchProduct(id, payload).subscribe({
        next: updated => {
          this.products.update(list => list.map(p => p.id === id ? { ...p, ...updated } : p));
          this.showToast('ok', 'Producto actualizado.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo actualizar.'); this.saving.set(false); }
      });
    }
  }

  // Delete
  confirmDelete(p: Product) { this.deleteTarget.set(p); }
  cancelDelete() { this.deleteTarget.set(null); }
  executeDelete() {
    const p = this.deleteTarget();
    if (!p) return;
    const prev = this.products();
    this.products.set(prev.filter(x => x.id !== p.id));
    this.deleteTarget.set(null);
    this.productSvc.deleteProduct(p.id).subscribe({
      next: () => this.showToast('ok', `"${p.name}" eliminado.`),
      error: () => { this.products.set(prev); this.showToast('err', 'No se pudo eliminar.'); }
    });
  }

  // Variants navigation
  goToVariants(productId: number) {
    this.router.navigate([this.adminBase, ROUTE_CONSTANTS.ADMIN.VARIANTS], { queryParams: { productId } });
  }

  // Bulk upload
  openBulk() { this.bulkOpen.set(true); this.bulkResult.set(null); this.bulkFile.set(null); }
  closeBulk() { this.bulkOpen.set(false); }

  onBulkFileSelect(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.bulkFile.set(file);
    this.bulkResult.set(null);
  }

  executeBulk() {
    const file = this.bulkFile();
    if (!file) return;
    this.bulkLoading.set(true);
    this.productSvc.bulkUploadProducts(file, this.bulkDryRun()).subscribe({
      next: res => {
        this.bulkResult.set(res);
        this.bulkLoading.set(false);
        if (!this.bulkDryRun()) this.loadProducts();
      },
      error: (e) => {
        this.bulkResult.set({ errors: [e?.error?.message ?? 'Error en la carga'] });
        this.bulkLoading.set(false);
      }
    });
  }

  // Form helpers
  setField(key: string, val: unknown) { this.form.update(f => ({ ...f, [key]: val })); }
  setSubcategoryId(val: string) { this.form.update(f => ({ ...f, subcategoryId: val ? Number(val) : null })); }

  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23e2e8f0"/></svg>';
  }

  variantCount(p: Product): number { return p.variants?.length ?? 0; }
  minPrice(p: Product): number {
    const prices = (p.variants ?? []).map(v => Number(v.price)).filter(n => n > 0);
    return prices.length ? Math.min(...prices) : 0;
  }
  totalStock(p: Product): number {
    return (p.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0);
  }

  private showToast(type: 'ok' | 'err', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
