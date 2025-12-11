// src/app/domains/pages/MenuProducts/offers-menu/offers-menu.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Offer } from '@shared/models/offer.model';

type SortKey =
  | 'id' | 'name' | 'brand'
  | 'price' | 'discountPrice' | 'stock'
  | 'outlet' | 'is_active' | 'created_at';
type SortDir = 'asc' | 'desc';

type NewOffer = {
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  brand?: string;
  imageUrl?: string;
  galleryUrls?: string;   // textarea/string
  price?: number | null;
  discountPrice?: number | null;
  sku?: string;
  stock?: number | null;
  unitOfMeasure?: string;
  dimensions?: string;
  tags?: string;          // textarea/string
  outlet?: boolean;
  is_active?: boolean;
};

// ⬅️ Edit type sin conflicto (string[] ➜ string para edición)
type EditOffer = Partial<Omit<Offer, 'galleryUrls' | 'tags'>> & {
  galleryUrls?: string;
  tags?: string;
};
@Component({
    selector: 'app-offers-menu',
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './offers-menu.component.html',
    styleUrl: './offers-menu.component.css'
})
export class OffersMenuComponent implements OnInit {

private http = inject(HttpClient); // ✅ corregido (private)

  private readonly BASE = 'https://gemmatex.store/api/v1';
  // private readonly BASE = 'http://localhost:3000/api/v1';

  loading = signal(false);
  saving  = signal(false);
  error   = signal<string | null>(null);
  okMsg   = signal<string | null>(null);

  offers = signal<Offer[]>([]);

  query = signal('');
  brandFilter = signal('');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  outletFilter = signal<'all' | 'only' | 'without'>('all');

  sortKey = signal<SortKey>('id');
  sortDir = signal<SortDir>('desc');

  newOffer = signal<NewOffer>({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    brand: '',
    imageUrl: '',
    galleryUrls: '',
    price: null,
    discountPrice: null,
    sku: '',
    stock: null,
    unitOfMeasure: '',
    dimensions: '',
    tags: '',
    outlet: false,
    is_active: true
  });

  editingId = signal<number | null>(null);
  editRow = signal<EditOffer>({}); // ✅ tipo sin intersección conflictiva

  filteredSorted = computed<Offer[]>(() => {
    const q = this.query().trim().toLowerCase();
    const brand = this.brandFilter().trim().toLowerCase();
    const active = this.activeFilter();
    const outlet = this.outletFilter();
    const key = this.sortKey();
    const dir = this.sortDir();

    let rows = this.offers().slice();

    if (brand) rows = rows.filter(r => (r.brand || '').toLowerCase().includes(brand));
    if (active !== 'all') rows = rows.filter(r => active === 'active' ? r.is_active : !r.is_active);
    if (outlet !== 'all') rows = rows.filter(r => outlet === 'only' ? !!r.outlet : !r.outlet);
    if (q) rows = rows.filter(o => {
      const hay = [
        o.id, o.name, o.slug, o.description, o.shortDescription, o.brand, o.sku
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });

    rows.sort((a, b) => {
      let A: any; let B: any;
      switch (key) {
        case 'id':            A = a.id; B = b.id; break;
        case 'name':          A = a.name || ''; B = b.name || ''; break;
        case 'brand':         A = a.brand || ''; B = b.brand || ''; break;
        case 'price':         A = a.price ?? 0; B = b.price ?? 0; break;
        case 'discountPrice': A = a.discountPrice ?? 0; B = b.discountPrice ?? 0; break;
        case 'stock':         A = a.stock ?? 0; B = b.stock ?? 0; break;
        case 'outlet':        A = a.outlet ? 1 : 0; B = b.outlet ? 1 : 0; break;
        case 'is_active':     A = a.is_active ? 1 : 0; B = b.is_active ? 1 : 0; break;
        case 'created_at':    A = a.created_at || ''; B = b.created_at || ''; break;
      }
      if (typeof A === 'string') A = A.toLowerCase();
      if (typeof B === 'string') B = B.toLowerCase();
      if (A < B) return dir === 'asc' ? -1 : 1;
      if (A > B) return dir === 'asc' ?  1 : -1;
      return 0;
    });

    return rows;
  });

  ngOnInit(): void { this.load(); }

  // ===== API =====
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<any[]>(`${this.BASE}/offers`).subscribe({
      next: rows => {
        this.offers.set((rows ?? []).map(this.normalizeFromApi));
        this.loading.set(false);
      },
      error: e => {
        console.error(e);
        this.error.set('No se pudieron cargar las ofertas.');
        this.loading.set(false);
      }
    });
  }
  refresh() { this.load(); }

  create() {
    const src = this.newOffer();
    if (!src.name?.trim()) { this.error.set('El nombre es obligatorio.'); return; }
    const payload = this.cleanCreate(src);

    this.saving.set(true); this.error.set(null); this.okMsg.set(null);
    this.http.post<any>(`${this.BASE}/offers`, payload).subscribe({
      next: created => {
        this.offers.update(list => [this.normalizeFromApi(created), ...list]);
        this.newOffer.set({
          name: '', slug: '', description: '', shortDescription: '', brand: '',
          imageUrl: '', galleryUrls: '', price: null, discountPrice: null, sku: '',
          stock: null, unitOfMeasure: '', dimensions: '', tags: '', outlet: false, is_active: true
        });
        this.okMsg.set('Oferta creada.');
        this.saving.set(false);
      },
      error: e => {
        console.error(e);
        this.error.set('No se pudo crear la oferta.');
        this.saving.set(false);
      }
    });
  }

  startEdit(row: Offer) {
    // ✅ evita el choque de tipos al esparcir
    const { galleryUrls, tags, ...rest } = row;
    this.editingId.set(row.id);
    this.editRow.set({
      ...rest,
      galleryUrls: (galleryUrls || []).join(', '),
      tags:        (tags || []).join(', ')
    });
    this.okMsg.set(null); this.error.set(null);
  }

  cancelEdit() { this.editingId.set(null); this.editRow.set({}); }

  saveEdit(id: number) {
    const src: EditOffer = this.editRow();
    if (!src.name?.trim()) { this.error.set('El nombre es obligatorio.'); return; }

    const payload = this.cleanEdit(src);
    this.saving.set(true); this.error.set(null); this.okMsg.set(null);

    const prev = this.offers();
    const idx = prev.findIndex(o => o.id === id);
    const backup = idx >= 0 ? { ...prev[idx] } : null;

    // optimista
    if (idx >= 0) {
      const merged: Offer = this.normalizeFromApi({ ...prev[idx], ...payload });
      this.offers.update(arr => { const copy = arr.slice(); copy[idx] = merged; return copy; });
    }

    this.http.patch<any>(`${this.BASE}/offers/${id}`, payload).subscribe({
      next: updated => {
        if (idx >= 0) {
          this.offers.update(arr => { const copy = arr.slice(); copy[idx] = this.normalizeFromApi(updated); return copy; });
        }
        this.okMsg.set('Oferta actualizada.');
        this.saving.set(false);
        this.cancelEdit();
      },
      error: e => {
        console.error(e);
        if (idx >= 0 && backup) {
          this.offers.update(arr => { const copy = arr.slice(); copy[idx] = backup!; return copy; });
        }
        this.error.set('No se pudo actualizar la oferta.');
        this.saving.set(false);
      }
    });
  }

  remove(row: Offer) {
    if (!confirm(`¿Eliminar la oferta "${row.name}"?`)) return;
    const id = row.id;

    const prev = this.offers();
    this.offers.set(prev.filter(o => o.id !== id));

    this.http.delete<void>(`${this.BASE}/offers/${id}`).subscribe({
      next: () => { this.okMsg.set('Oferta eliminada.'); },
      error: e => {
        console.error(e);
        this.offers.set(prev);
        this.error.set('No se pudo eliminar la oferta.');
      }
    });
  }

  // ===== UI helpers =====
  setNew<K extends keyof NewOffer>(key: K, v: any) { this.newOffer.set({ ...this.newOffer(), [key]: v }); }
  setNewName(v: string) {
    const slug = !this.newOffer().slug ? this.slugify(v) : this.newOffer().slug;
    this.newOffer.set({ ...this.newOffer(), name: v, slug });
  }
  setEdit<K extends keyof EditOffer>(key: K, v: any) { this.editRow.set({ ...this.editRow(), [key]: v }); }

  setSort(key: SortKey) {
    if (this.sortKey() === key) this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    else { this.sortKey.set(key); this.sortDir.set('asc'); }
  }
  sortArrow(k: SortKey) { return this.sortKey() !== k ? '' : (this.sortDir() === 'asc' ? '▲' : '▼'); }

  trackById = (_: number, o: Offer) => o.id;
  onImgError(ev: Event) { (ev.target as HTMLImageElement).src = '/assets/placeholders/product.webp'; }
  toNum = (v: any) => (v === '' || v == null) ? null : Number(v);
  toInt = (v: any) => (v === '' || v == null) ? null : Math.trunc(Number(v));

  // ===== Normalización / payloads =====
  private parseList(input?: string): string[] {
    if (!input) return [];
    return input.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean);
  }

  private cleanCreate(src: NewOffer) {
    return {
      name: (src.name || '').trim(),
      slug: (src.slug || this.slugify(src.name || '')).trim(),
      description: (src.description || '').trim(),
      shortDescription: (src.shortDescription || '').trim(),
      brand: (src.brand || '').trim(),
      imageUrl: (src.imageUrl || '').trim(),
      galleryUrls: this.parseList(src.galleryUrls),
      price: Number(src.price ?? 0),
      discountPrice: Number(src.discountPrice ?? 0),
      sku: (src.sku || '').trim(),
      stock: Number(src.stock ?? 0),
      unitOfMeasure: (src.unitOfMeasure || '').trim(),
      dimensions: (src.dimensions || '').trim(),
      tags: this.parseList(src.tags),
      outlet: Boolean(src.outlet ?? false),
      is_active: Boolean(src.is_active ?? true)
    };
  }

  private cleanEdit(src: EditOffer) {
    const out: any = {};
    if (src.name !== undefined)            out.name = String(src.name).trim();
    if (src.slug !== undefined)            out.slug = String(src.slug).trim() || this.slugify(String(src.name ?? ''));
    if (src.description !== undefined)     out.description = String(src.description).trim();
    if (src.shortDescription !== undefined)out.shortDescription = String(src.shortDescription).trim();
    if (src.brand !== undefined)           out.brand = String(src.brand).trim();
    if (src.imageUrl !== undefined)        out.imageUrl = String(src.imageUrl).trim();
    if (src.galleryUrls !== undefined)     out.galleryUrls = this.parseList(String(src.galleryUrls));
    if (src.price !== undefined)           out.price = Number(src.price ?? 0);
    if (src.discountPrice !== undefined)   out.discountPrice = Number(src.discountPrice ?? 0);
    if (src.sku !== undefined)             out.sku = String(src.sku).trim();
    if (src.stock !== undefined)           out.stock = Number(src.stock ?? 0);
    if (src.unitOfMeasure !== undefined)   out.unitOfMeasure = String(src.unitOfMeasure).trim();
    if (src.dimensions !== undefined)      out.dimensions = String(src.dimensions).trim();
    if (src.tags !== undefined)            out.tags = this.parseList(String(src.tags));
    if (src.outlet !== undefined)          out.outlet = Boolean(src.outlet);
    if (src.is_active !== undefined)       out.is_active = Boolean(src.is_active);
    return out;
  }

  private normalizeFromApi = (o: any): Offer => ({
    id: Number(o.id),
    name: o.name ?? '',
    slug: o.slug ?? '',
    description: o.description ?? '',
    shortDescription: o.shortDescription ?? '',
    brand: o.brand ?? '',
    imageUrl: o.imageUrl ?? '',
    galleryUrls: Array.isArray(o.galleryUrls) ? o.galleryUrls : (o.gallery_urls ?? []),
    price: Number(o.price ?? 0),
    discountPrice: Number(o.discountPrice ?? 0),
    sku: o.sku ?? '',
    stock: Number(o.stock ?? 0),
    unitOfMeasure: String(o.unitOfMeasure ?? ''),
    dimensions: String(o.dimensions ?? ''),
    tags: Array.isArray(o.tags) ? o.tags : (typeof o.tags === 'string' ? this.parseList(o.tags) : []),
    outlet: Boolean(o.outlet ?? false),
    is_active: Boolean(o.is_active ?? true),
    created_at: o.created_at ?? o.createdAt ?? '',
    updated_at: o.updated_at ?? o.updatedAt ?? ''
  });

  private slugify(s: string) {
    return String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
