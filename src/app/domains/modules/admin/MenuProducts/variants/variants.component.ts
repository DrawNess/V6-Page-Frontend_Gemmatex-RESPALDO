import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Color } from '@shared/models/color.model';
import { Product } from '@shared/models/product.model';
import { Variant } from '@shared/models/variant.model';
import { ColorService } from '@shared/services/color.service';
import { ProductService } from '@shared/services/product.service';
import { VariantService, CreateVariantDTO } from '@shared/services/variant.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

type VariantForm = {
  sku: string; colorId: number | null; description: string; shortDescription: string;
  brand: string; imageUrl: string; galleryUrls: string; price: number | null;
  discountPrice: number | null; stock: number | null; unitOfMeasure: string;
  dimensions: string; tags: string; outlet: boolean; is_active: boolean;
};

const EMPTY_FORM: VariantForm = {
  sku: '', colorId: null, description: '', shortDescription: '', brand: '',
  imageUrl: '', galleryUrls: '', price: null, discountPrice: null, stock: null,
  unitOfMeasure: '', dimensions: '', tags: '', outlet: false, is_active: true,
};

@Component({
  selector: 'app-variants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './variants.component.html',
  styleUrl: './variants.component.css'
})
export class VariantsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private variantSvc = inject(VariantService);
  private productSvc = inject(ProductService);
  private colorSvc = inject(ColorService);
  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  productId = signal<number | null>(null);
  product = signal<Product | null>(null);
  variants = signal<Variant[]>([]);
  colors = signal<Color[]>([]);

  loading = signal(false);
  saving = signal(false);
  toast = signal<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Modal
  modalOpen = signal(false);
  modalMode = signal<'create' | 'edit'>('create');
  form = signal<VariantForm>({ ...EMPTY_FORM });
  editId = signal<number | null>(null);

  // Delete
  deleteTarget = signal<Variant | null>(null);

  // Bulk
  bulkOpen = signal(false);
  bulkFile = signal<File | null>(null);
  bulkDryRun = signal(true);
  bulkResult = signal<{ created?: number; updated?: number; errors?: unknown[] } | null>(null);
  bulkLoading = signal(false);

  readonly activeVariants = computed(() => this.variants().filter(v => v.is_active));

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = Number(params['productId']);
      if (!id) { this.showToast('err', 'No se especificó un producto.'); return; }
      this.productId.set(id);
      this.productSvc.getOne(String(id)).subscribe({ next: p => this.product.set(p), error: () => {} });
      this.loadVariants(id);
      this.colorSvc.getColors().subscribe({
        next: c => { this.colors.set(c ?? []); this.refreshVariantColors(); },
        error: () => {}
      });
    });
  }

  loadVariants(id?: number) {
    const pid = id ?? this.productId();
    if (!pid) return;
    this.loading.set(true);
    this.variantSvc.getVariantsByProduct(pid).subscribe({
      next: rows => { this.variants.set(rows ?? []); this.refreshVariantColors(); this.loading.set(false); },
      error: () => { this.showToast('err', 'No se pudieron cargar variantes.'); this.loading.set(false); }
    });
  }

  // Modal
  openCreate() {
    this.modalMode.set('create');
    this.editId.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.modalOpen.set(true);
  }

  openEdit(v: Variant) {
    this.modalMode.set('edit');
    this.editId.set(v.id);
    this.form.set({
      sku: v.sku, colorId: v.colorId, description: v.description ?? '',
      shortDescription: v.shortDescription ?? '', brand: v.brand ?? '',
      imageUrl: v.imageUrl ?? '', galleryUrls: (v.galleryUrls ?? []).join(', '),
      price: Number(v.price) || null, discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
      stock: v.stock ?? null, unitOfMeasure: v.unitOfMeasure ?? '',
      dimensions: v.dimensions ?? '', tags: (v.tags ?? []).join(', '),
      outlet: v.outlet ?? false, is_active: v.is_active ?? true,
    });
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  save() {
    const pid = this.productId();
    if (!pid) return;
    const f = this.form();
    if (!f.sku.trim()) { this.showToast('err', 'El SKU es obligatorio.'); return; }

    const payload: CreateVariantDTO = {
      productId: pid,
      sku: f.sku.trim(),
      colorId: f.colorId ?? null,
      description: f.description.trim(),
      shortDescription: f.shortDescription.trim(),
      brand: f.brand.trim(),
      imageUrl: f.imageUrl.trim(),
      galleryUrls: this.parseList(f.galleryUrls),
      price: Number(f.price ?? 0),
      discountPrice: f.discountPrice && Number(f.discountPrice) > 0 ? Number(f.discountPrice) : null,
      stock: Math.trunc(Number(f.stock ?? 0)),
      unitOfMeasure: f.unitOfMeasure.trim(),
      dimensions: f.dimensions.trim(),
      tags: this.parseList(f.tags),
      outlet: f.outlet,
      is_active: f.is_active,
    };

    this.saving.set(true);

    if (this.modalMode() === 'create') {
      this.variantSvc.createVariant(payload).subscribe({
        next: created => {
          const hydrated = this.withColor(created);
          this.variants.update(list => [hydrated, ...list]);
          this.showToast('ok', 'Variante creada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo crear.'); this.saving.set(false); }
      });
    } else {
      const id = this.editId()!;
      this.variantSvc.updateVariant(id, payload).subscribe({
        next: updated => {
          this.variants.update(list => list.map(v => v.id === id ? this.withColor({ ...v, ...payload as any, ...updated }) : v));
          this.showToast('ok', 'Variante actualizada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo actualizar.'); this.saving.set(false); }
      });
    }
  }

  // Delete
  confirmDelete(v: Variant) { this.deleteTarget.set(v); }
  cancelDelete() { this.deleteTarget.set(null); }
  executeDelete() {
    const v = this.deleteTarget();
    if (!v) return;
    const prev = this.variants();
    this.variants.set(prev.filter(x => x.id !== v.id));
    this.deleteTarget.set(null);
    this.variantSvc.deleteVariant(v.id).subscribe({
      next: () => this.showToast('ok', `"${v.sku}" eliminada.`),
      error: () => { this.variants.set(prev); this.showToast('err', 'No se pudo eliminar.'); }
    });
  }

  // Bulk
  openBulk() { this.bulkOpen.set(true); this.bulkResult.set(null); this.bulkFile.set(null); }
  closeBulk() { this.bulkOpen.set(false); }
  onBulkFileSelect(ev: Event) { this.bulkFile.set((ev.target as HTMLInputElement).files?.[0] ?? null); this.bulkResult.set(null); }
  executeBulk() {
    const file = this.bulkFile();
    if (!file) return;
    this.bulkLoading.set(true);
    this.variantSvc.bulkUpload(file, this.bulkDryRun()).subscribe({
      next: res => { this.bulkResult.set(res); this.bulkLoading.set(false); if (!this.bulkDryRun()) this.loadVariants(); },
      error: e => { this.bulkResult.set({ errors: [e?.error?.message ?? 'Error'] }); this.bulkLoading.set(false); }
    });
  }

  // Helpers
  goBackToProducts() { this.router.navigate([this.adminBase, ROUTE_CONSTANTS.ADMIN.PRODUCTS]); }
  setField(key: string, val: unknown) { this.form.update(f => ({ ...f, [key]: val } as VariantForm)); }
  setColorId(val: string) { this.form.update(f => ({ ...f, colorId: val ? Number(val) : null })); }
  colorName(id: number | null) { return id ? (this.colors().find(c => c.id === id)?.name ?? '—') : '—'; }
  colorHex(id: number | null) { return id ? (this.colors().find(c => c.id === id)?.hex ?? null) : null; }

  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23e2e8f0"/></svg>';
  }

  private parseList(input?: string): string[] {
    if (!input) return [];
    return input.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean);
  }

  private refreshVariantColors() {
    const colors = this.colors();
    if (!colors.length) return;
    this.variants.update(list => list.map(v => this.withColor(v)));
  }

  private withColor(v: Variant): Variant {
    const color = v.colorId ? this.colors().find(c => c.id === v.colorId) ?? null : null;
    return { ...v, color };
  }

  private showToast(type: 'ok' | 'err', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
