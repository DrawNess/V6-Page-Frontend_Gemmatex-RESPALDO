import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Offer } from '@shared/models/offer.model';
import { environment } from '@environments/environment';

type OfferForm = {
  name: string; slug: string; description: string; shortDescription: string;
  brand: string; imageUrl: string; galleryUrls: string; price: number | null;
  discountPrice: number | null; sku: string; stock: number | null;
  unitOfMeasure: string; dimensions: string; tags: string;
  outlet: boolean; is_active: boolean;
};

const EMPTY_FORM: OfferForm = {
  name: '', slug: '', description: '', shortDescription: '', brand: '',
  imageUrl: '', galleryUrls: '', price: null, discountPrice: null, sku: '',
  stock: null, unitOfMeasure: '', dimensions: '', tags: '',
  outlet: false, is_active: true,
};

@Component({
  selector: 'app-offers-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offers-menu.component.html',
  styleUrl: './offers-menu.component.css'
})
export class OffersMenuComponent {
  private http = inject(HttpClient);
  private readonly BASE = environment.API_URL;

  loading = signal(false);
  saving = signal(false);
  toast = signal<{ type: 'ok' | 'err'; msg: string } | null>(null);

  offers = signal<Offer[]>([]);
  query = signal('');
  brandFilter = signal('');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Modal
  modalOpen = signal(false);
  modalMode = signal<'create' | 'edit'>('create');
  form = signal<OfferForm>({ ...EMPTY_FORM });
  editId = signal<number | null>(null);

  deleteTarget = signal<Offer | null>(null);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const brand = this.brandFilter().trim().toLowerCase();
    const active = this.activeFilter();

    let rows = this.offers().slice();
    if (brand) rows = rows.filter(r => (r.brand || '').toLowerCase().includes(brand));
    if (active !== 'all') rows = rows.filter(r => active === 'active' ? r.is_active : !r.is_active);
    if (q) rows = rows.filter(o => [o.name, o.sku, o.brand, o.description].filter(Boolean).join(' ').toLowerCase().includes(q));
    return rows;
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.BASE}/offers`).subscribe({
      next: rows => { this.offers.set((rows ?? []).map(this.normalize)); this.loading.set(false); },
      error: () => { this.showToast('err', 'No se pudieron cargar las ofertas.'); this.loading.set(false); }
    });
  }

  openCreate() {
    this.modalMode.set('create');
    this.editId.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.modalOpen.set(true);
  }

  openEdit(o: Offer) {
    this.modalMode.set('edit');
    this.editId.set(o.id);
    this.form.set({
      name: o.name, slug: o.slug ?? '', description: o.description ?? '',
      shortDescription: o.shortDescription ?? '', brand: o.brand ?? '',
      imageUrl: o.imageUrl ?? '', galleryUrls: (o.galleryUrls ?? []).join(', '),
      price: o.price ?? null, discountPrice: o.discountPrice ?? null,
      sku: o.sku ?? '', stock: o.stock ?? null,
      unitOfMeasure: o.unitOfMeasure ?? '', dimensions: o.dimensions ?? '',
      tags: (o.tags ?? []).join(', '), outlet: o.outlet ?? false, is_active: o.is_active ?? true,
    });
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  save() {
    const f = this.form();
    if (!f.name.trim()) { this.showToast('err', 'El nombre es obligatorio.'); return; }

    const payload = {
      name: f.name.trim(),
      slug: f.slug.trim() || this.slugify(f.name),
      description: f.description.trim(),
      shortDescription: f.shortDescription.trim(),
      brand: f.brand.trim(),
      imageUrl: f.imageUrl.trim(),
      galleryUrls: this.parseList(f.galleryUrls),
      price: Number(f.price ?? 0),
      discountPrice: Number(f.discountPrice ?? 0),
      sku: f.sku.trim(),
      stock: Math.trunc(Number(f.stock ?? 0)),
      unitOfMeasure: f.unitOfMeasure.trim(),
      dimensions: f.dimensions.trim(),
      tags: this.parseList(f.tags),
      outlet: f.outlet,
      is_active: f.is_active,
    };

    this.saving.set(true);

    if (this.modalMode() === 'create') {
      this.http.post<any>(`${this.BASE}/offers`, payload).subscribe({
        next: created => {
          this.offers.update(list => [this.normalize(created), ...list]);
          this.showToast('ok', 'Oferta creada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo crear.'); this.saving.set(false); }
      });
    } else {
      const id = this.editId()!;
      this.http.patch<any>(`${this.BASE}/offers/${id}`, payload).subscribe({
        next: updated => {
          this.offers.update(list => list.map(o => o.id === id ? this.normalize(updated) : o));
          this.showToast('ok', 'Oferta actualizada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo actualizar.'); this.saving.set(false); }
      });
    }
  }

  confirmDelete(o: Offer) { this.deleteTarget.set(o); }
  cancelDelete() { this.deleteTarget.set(null); }
  executeDelete() {
    const o = this.deleteTarget();
    if (!o) return;
    const prev = this.offers();
    this.offers.set(prev.filter(x => x.id !== o.id));
    this.deleteTarget.set(null);
    this.http.delete<void>(`${this.BASE}/offers/${o.id}`).subscribe({
      next: () => this.showToast('ok', `"${o.name}" eliminada.`),
      error: () => { this.offers.set(prev); this.showToast('err', 'No se pudo eliminar.'); }
    });
  }

  // Form helpers
  onNameInput(val: string) { this.form.update(f => ({ ...f, name: val, slug: f.slug ? f.slug : this.slugify(val) })); }
  setField(key: string, val: unknown) { this.form.update(f => ({ ...f, [key]: val } as OfferForm)); }

  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23e2e8f0"/></svg>';
  }

  private normalize = (o: any): Offer => ({
    id: Number(o.id), name: o.name ?? '', slug: o.slug ?? '',
    description: o.description ?? '', shortDescription: o.shortDescription ?? '',
    brand: o.brand ?? '', imageUrl: o.imageUrl ?? '',
    galleryUrls: Array.isArray(o.galleryUrls) ? o.galleryUrls : (o.gallery_urls ?? []),
    price: Number(o.price ?? 0), discountPrice: Number(o.discountPrice ?? 0),
    sku: o.sku ?? '', stock: Number(o.stock ?? 0),
    unitOfMeasure: String(o.unitOfMeasure ?? ''), dimensions: String(o.dimensions ?? ''),
    tags: Array.isArray(o.tags) ? o.tags : this.parseList(o.tags),
    outlet: Boolean(o.outlet), is_active: Boolean(o.is_active ?? true),
    created_at: o.created_at ?? o.createdAt ?? '', updated_at: o.updated_at ?? o.updatedAt ?? ''
  });

  private parseList(input?: string): string[] {
    if (!input) return [];
    return input.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean);
  }

  private slugify(s: string) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private showToast(type: 'ok' | 'err', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
