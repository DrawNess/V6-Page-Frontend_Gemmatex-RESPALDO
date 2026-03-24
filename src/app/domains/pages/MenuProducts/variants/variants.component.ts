import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Color } from '@shared/models/color.model';
import { Product } from '@shared/models/product.model';
import { Variant } from '@shared/models/variant.model';
import { ColorService } from '@shared/services/color.service';
import { ProductService } from '@shared/services/product.service';
import { VariantService, CreateVariantDTO } from '@shared/services/variant.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

type NewVariantForm = {
  sku: string;
  colorId: number | null;
  description: string;
  shortDescription: string;
  brand: string;
  imageUrl: string;
  galleryUrls: string;
  price: number | null;
  discountPrice: number | null;
  stock: number | null;
  unitOfMeasure: string;
  dimensions: string;
  tags: string;
  outlet: boolean;
  is_active: boolean;
};

const EMPTY_FORM: NewVariantForm = {
  sku: '',
  colorId: null,
  description: '',
  shortDescription: '',
  brand: '',
  imageUrl: '',
  galleryUrls: '',
  price: null,
  discountPrice: null,
  stock: null,
  unitOfMeasure: '',
  dimensions: '',
  tags: '',
  outlet: false,
  is_active: true,
};

@Component({
  selector: 'app-variants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './variants.component.html',
})
export class VariantsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private variantService = inject(VariantService);
  private productService = inject(ProductService);
  private colorService = inject(ColorService);

  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;
  readonly productsUrl = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.PRODUCTS}`;

  productId = signal<number | null>(null);
  product = signal<Product | null>(null);
  variants = signal<Variant[]>([]);
  colors = signal<Color[]>([]);

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  okMsg = signal<string | null>(null);

  showCreateForm = signal(false);
  newVariant = signal<NewVariantForm>({ ...EMPTY_FORM });

  editingId = signal<number | null>(null);
  editRow = signal<any>({});

  readonly activeVariants = computed(() => this.variants().filter(v => v.is_active));

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = Number(params['productId']);
      if (!id) { this.error.set('No se especificó un producto.'); return; }
      this.productId.set(id);
      this.loadProduct(id);
      this.loadVariants(id);
      this.loadColors();
    });
  }

  private loadProduct(id: number) {
    this.productService.getOne(String(id)).subscribe({
      next: p => this.product.set(p ?? null),
      error: () => this.product.set(null)
    });
  }

  loadVariants(id?: number) {
    const pid = id ?? this.productId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);
    this.variantService.getVariantsByProduct(pid).subscribe({
      next: rows => { this.variants.set(rows ?? []); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar las variantes.'); this.loading.set(false); }
    });
  }

  private loadColors() {
    this.colorService.getColors().subscribe({
      next: cols => this.colors.set(cols ?? []),
      error: () => this.colors.set([])
    });
  }

  // ---------- CREAR ----------
  create() {
    const pid = this.productId();
    if (!pid) return;
    const src = this.newVariant();
    if (!src.sku?.trim()) { this.error.set('El SKU es obligatorio.'); return; }
    if (!src.description?.trim()) { this.error.set('La descripción es obligatoria.'); return; }
    if (!src.shortDescription?.trim()) { this.error.set('La descripción corta es obligatoria.'); return; }
    if (!src.brand?.trim()) { this.error.set('La marca es obligatoria.'); return; }
    if (!src.imageUrl?.trim()) { this.error.set('La URL de imagen es obligatoria.'); return; }
    if (src.price === null || src.price === undefined) { this.error.set('El precio es obligatorio.'); return; }
    if (src.stock === null || src.stock === undefined) { this.error.set('El stock es obligatorio.'); return; }
    if (!src.unitOfMeasure?.trim()) { this.error.set('La unidad de medida es obligatoria.'); return; }
    if (!src.dimensions?.trim()) { this.error.set('Las dimensiones son obligatorias.'); return; }

    const payload: CreateVariantDTO = {
      productId: pid,
      sku: src.sku.trim(),
      colorId: src.colorId ?? null,
      description: src.description.trim(),
      shortDescription: src.shortDescription.trim(),
      brand: src.brand.trim(),
      imageUrl: src.imageUrl.trim(),
      galleryUrls: this.parseList(src.galleryUrls),
      price: Number(src.price),
      discountPrice: src.discountPrice != null && src.discountPrice !== 0 ? Number(src.discountPrice) : null,
      stock: Math.trunc(Number(src.stock)),
      unitOfMeasure: src.unitOfMeasure.trim(),
      dimensions: src.dimensions.trim(),
      tags: this.parseList(src.tags),
      outlet: Boolean(src.outlet),
      is_active: Boolean(src.is_active ?? true),
    };

    this.saving.set(true);
    this.error.set(null);
    this.okMsg.set(null);
    this.variantService.createVariant(payload).subscribe({
      next: created => {
        this.variants.update(list => [created, ...list]);
        this.newVariant.set({ ...EMPTY_FORM });
        this.showCreateForm.set(false);
        this.okMsg.set('Variante creada.');
        this.saving.set(false);
      },
      error: () => { this.error.set('No se pudo crear la variante.'); this.saving.set(false); }
    });
  }

  // ---------- EDITAR ----------
  startEdit(v: Variant) {
    this.editingId.set(v.id);
    this.editRow.set({
      ...v,
      galleryUrls: (v.galleryUrls || []).join(', '),
      tags: (v.tags || []).join(', '),
      colorId: v.colorId ?? null,
    });
    this.okMsg.set(null);
    this.error.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editRow.set({});
  }

  saveEdit(id: number) {
    const src = this.editRow();
    if (!src.sku?.trim()) { this.error.set('El SKU es obligatorio.'); return; }

    const payload: Partial<CreateVariantDTO> = {
      sku: String(src.sku).trim(),
      colorId: src.colorId != null && src.colorId !== '' ? Number(src.colorId) : null,
      description: String(src.description ?? '').trim(),
      shortDescription: String(src.shortDescription ?? '').trim(),
      brand: String(src.brand ?? '').trim(),
      imageUrl: String(src.imageUrl ?? '').trim(),
      galleryUrls: this.parseList(String(src.galleryUrls ?? '')),
      price: Number(src.price ?? 0),
      discountPrice: src.discountPrice != null && src.discountPrice !== '' && Number(src.discountPrice) > 0
        ? Number(src.discountPrice) : null,
      stock: Math.trunc(Number(src.stock ?? 0)),
      unitOfMeasure: String(src.unitOfMeasure ?? '').trim(),
      dimensions: String(src.dimensions ?? '').trim(),
      tags: this.parseList(String(src.tags ?? '')),
      outlet: Boolean(src.outlet),
      is_active: Boolean(src.is_active),
    };

    this.saving.set(true);
    this.error.set(null);
    this.okMsg.set(null);

    const prev = this.variants();
    const idx = prev.findIndex(v => v.id === id);
    const backup = idx >= 0 ? { ...prev[idx] } : null;
    if (idx >= 0) {
      this.variants.update(arr => {
        const copy = arr.slice();
        copy[idx] = { ...prev[idx], ...payload } as Variant;
        return copy;
      });
    }

    this.variantService.updateVariant(id, payload).subscribe({
      next: updated => {
        if (idx >= 0) {
          this.variants.update(arr => { const c = arr.slice(); c[idx] = updated; return c; });
        }
        this.okMsg.set('Variante actualizada.');
        this.saving.set(false);
        this.cancelEdit();
      },
      error: () => {
        if (idx >= 0 && backup) {
          this.variants.update(arr => { const c = arr.slice(); c[idx] = backup!; return c; });
        }
        this.error.set('No se pudo actualizar la variante.');
        this.saving.set(false);
      }
    });
  }

  // ---------- ELIMINAR ----------
  remove(v: Variant) {
    if (!confirm(`¿Eliminar la variante "${v.sku}"?`)) return;
    const prev = this.variants();
    this.variants.set(prev.filter(x => x.id !== v.id));
    this.variantService.deleteVariant(v.id).subscribe({
      next: () => this.okMsg.set('Variante eliminada.'),
      error: () => { this.variants.set(prev); this.error.set('No se pudo eliminar la variante.'); }
    });
  }

  // ---------- HELPERS ----------
  setNew<K extends keyof NewVariantForm>(key: K, val: any) {
    this.newVariant.set({ ...this.newVariant(), [key]: val });
  }

  setEdit(key: string, val: any) {
    this.editRow.set({ ...this.editRow(), [key]: val });
  }

  colorName(colorId: number | null): string {
    if (!colorId) return '—';
    return this.colors().find(c => c.id === colorId)?.name ?? `#${colorId}`;
  }

  colorHex(colorId: number | null): string | null {
    if (!colorId) return null;
    return this.colors().find(c => c.id === colorId)?.hex ?? null;
  }

  isLightColor(hex: string | null): boolean {
    if (!hex || !hex.startsWith('#')) return false;
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 200;
    } catch { return false; }
  }

  trackById = (_: number, v: Variant) => v.id;

  private parseList(input?: string): string[] {
    if (!input) return [];
    return input.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean);
  }
}
