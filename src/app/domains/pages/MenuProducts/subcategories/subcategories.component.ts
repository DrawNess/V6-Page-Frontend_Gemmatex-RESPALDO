import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { Category } from '@shared/models/category.model';
import { Subcategory } from '@shared/models/subcategory.model';

type SortKey = 'id' | 'name' | 'slug' | 'category' | 'createdAt';
type SortDir = 'asc' | 'desc';

// 👇 Vista local: hacemos category opcional y añadimos categoryId
type ViewSub = Omit<Subcategory, 'category'> & {
  category?: Category;
  categoryId?: number | null;
};

type NewSubcategory = {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  categoryId: number | null;
};

@Component({
    selector: 'app-subcategories',
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './subcategories.component.html',
    styleUrl: './subcategories.component.css'
})
export class SubcategoriesComponent implements OnInit {

  private http = inject(HttpClient);
  private readonly BASE = 'https://gemmatex.store/api/v1';
  // private readonly BASE = 'http://localhost:3000/api/v1';

  // Estado
  loading = signal(false);
  saving  = signal(false);
  error   = signal<string | null>(null);
  okMsg   = signal<string | null>(null);

  // Datos
  categories    = signal<Category[]>([]);
  subcategories = signal<ViewSub[]>([]);

  // Filtros
  query = signal('');
  categoryFilter = signal<number | ''>('');

  // Orden
  sortKey = signal<SortKey>('id');
  sortDir = signal<SortDir>('asc');

  // Crear
  newSub = signal<NewSubcategory>({
    name: '',
    slug: '',
    description: '',
    image: '',
    categoryId: null
  });

  // Edición
  editingId = signal<number | null>(null);
  editRow = signal<Partial<ViewSub> & { categoryId?: number | null }>({});

  // Mapa categorías
  private catMap = computed(() => {
    const map = new Map<number, Category>();
    for (const c of this.categories()) map.set(c.id, c);
    return map;
  });

  // Lista filtrada + ordenada
  filteredSorted = computed(() => {
    const q = this.query().trim().toLowerCase();
    const fCat = this.categoryFilter();
    const key = this.sortKey();
    const dir = this.sortDir();

    let rows = this.subcategories().slice();

    if (fCat !== '') {
      rows = rows.filter(r => (r.categoryId ?? r.category?.id) === Number(fCat));
    }

    if (q) {
      rows = rows.filter(s => {
        const hay = [
          s.id, s.name, s.slug, s.description,
          s.category?.name
        ].filter(Boolean).join(' ').toString().toLowerCase();
        return hay.includes(q);
      });
    }

    rows.sort((a, b) => {
      let A: any; let B: any;
      switch (key) {
        case 'id':        A = a.id; B = b.id; break;
        case 'name':      A = a.name || ''; B = b.name || ''; break;
        case 'slug':      A = a.slug || ''; B = b.slug || ''; break;
        case 'category':  A = a.category?.name || ''; B = b.category?.name || ''; break;
        case 'createdAt': A = a.createdAt || ''; B = b.createdAt || ''; break;
      }
      if (typeof A === 'string') A = A.toLowerCase();
      if (typeof B === 'string') B = B.toLowerCase();
      if (A < B) return dir === 'asc' ? -1 : 1;
      if (A > B) return dir === 'asc' ?  1 : -1;
      return 0;
    });

    return rows;
  });

  ngOnInit() {
    this.loadAll();
  }

  // ===== API =====
  private async loadAll() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [cats, subs] = await Promise.all([
        this.http.get<Category[]>(`${this.BASE}/categories`).toPromise(),
        this.http.get<any[]>(`${this.BASE}/subcategories`).toPromise()
      ]);

      this.categories.set(cats ?? []);

      const cmap = new Map((cats ?? []).map(c => [c.id, c]));
      const norm: ViewSub[] = (subs ?? []).map((s: any) => {
        const cid = Number(s.categoryId ?? s.category?.id ?? NaN);
        const cat = Number.isFinite(cid) ? (cmap.get(cid) || s.category) : s.category;
        return {
          ...s,
          categoryId: Number.isFinite(cid) ? cid : null,
          category: cat // opcional en ViewSub
        };
      });

      this.subcategories.set(norm);
      this.loading.set(false);
    } catch (e) {
      console.error(e);
      this.error.set('No se pudo cargar la información.');
      this.loading.set(false);
    }
  }

  refresh() { this.loadAll(); }

  // ===== Crear =====
  create() {
    const src = this.newSub();
    if (!src.name?.trim()) { this.error.set('El nombre es obligatorio.'); return; }
    if (src.categoryId == null) { this.error.set('Seleccione una categoría.'); return; }

    const payload = this.cleanCreate(src);
    this.saving.set(true); this.error.set(null); this.okMsg.set(null);

    this.http.post<ViewSub>(`${this.BASE}/subcategories`, payload).subscribe({
      next: (created) => {
        const cid = (created as any).categoryId ?? created.category?.id ?? payload.categoryId;
        const cat = cid ? this.catMap().get(Number(cid)) : created.category;

        const view: ViewSub = { ...created, categoryId: cid ?? null, category: cat };
        this.subcategories.update(list => [view, ...list]);

        this.newSub.set({ name:'', slug:'', description:'', image:'', categoryId: null });
        this.okMsg.set('Subcategoría creada.');
        this.saving.set(false);
      },
      error: (e) => {
        console.error(e);
        this.error.set('No se pudo crear la subcategoría.');
        this.saving.set(false);
      }
    });
  }

  // ===== Editar =====
  startEdit(row: ViewSub) {
    this.editingId.set(row.id);
    this.editRow.set({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      image: row.image,
      categoryId: row.categoryId ?? row.category?.id ?? null
    });
    this.okMsg.set(null); this.error.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editRow.set({});
  }

  saveEdit(id: number) {
    const src = this.editRow();
    if (!src.name?.trim()) { this.error.set('El nombre es obligatorio.'); return; }
    if (src.categoryId == null) { this.error.set('Seleccione una categoría.'); return; }

    const payload = this.cleanEdit(src);
    this.saving.set(true); this.error.set(null); this.okMsg.set(null);

    // Optimista
    const prev = this.subcategories();
    const idx  = prev.findIndex(s => s.id === id);
    const backup = idx >= 0 ? { ...prev[idx] } : null;

    if (idx >= 0) {
      const merged: ViewSub = {
        ...prev[idx],
        ...payload,
        categoryId: Number(payload.categoryId ?? prev[idx].categoryId ?? prev[idx].category?.id ?? null),
        category: this.catMap().get(Number(payload.categoryId)) ?? prev[idx].category
      };
      this.subcategories.update(arr => {
        const copy = arr.slice();
        copy[idx] = merged;
        return copy;
      });
    }

    this.http.patch<ViewSub>(`${this.BASE}/subcategories/${id}`, payload).subscribe({
      next: (updated) => {
        const cid = (updated as any).categoryId ?? updated.category?.id ?? payload.categoryId;
        const cat = cid ? this.catMap().get(Number(cid)) : updated.category;
        const view: ViewSub = { ...updated, categoryId: cid ?? null, category: cat };

        if (idx >= 0) {
          this.subcategories.update(arr => {
            const copy = arr.slice();
            copy[idx] = view;
            return copy;
          });
        }
        this.okMsg.set('Subcategoría actualizada.');
        this.saving.set(false);
        this.cancelEdit();
      },
      error: (e) => {
        console.error(e);
        if (idx >= 0 && backup) {
          this.subcategories.update(arr => {
            const copy = arr.slice();
            copy[idx] = backup!;
            return copy;
          });
        }
        this.error.set('No se pudo actualizar la subcategoría.');
        this.saving.set(false);
      }
    });
  }

  // ===== Eliminar =====
  remove(row: ViewSub) {
    if (!confirm(`¿Eliminar la subcategoría "${row.name}"?`)) return;
    const id = row.id;

    const prev = this.subcategories();
    this.subcategories.set(prev.filter(s => s.id !== id));

    this.http.delete<void>(`${this.BASE}/subcategories/${id}`).subscribe({
      next: () => { this.okMsg.set('Subcategoría eliminada.'); },
      error: (e) => {
        console.error(e);
        this.subcategories.set(prev);
        this.error.set('No se pudo eliminar (ver si tiene productos).');
      }
    });
  }

  // ===== Helpers formulario =====
  setNewName(v: string) {
    const slug = !this.newSub().slug ? this.slugify(v) : this.newSub().slug;
    this.newSub.set({ ...this.newSub(), name: v, slug });
  }
  setNewSlug(v: string)        { this.newSub.set({ ...this.newSub(), slug: v }); }
  setNewImage(v: string)       { this.newSub.set({ ...this.newSub(), image: v }); }
  setNewDesc(v: string)        { this.newSub.set({ ...this.newSub(), description: v }); }
  setNewCategoryId(v: string)  { this.newSub.set({ ...this.newSub(), categoryId: v ? Number(v) : null }); }

  setEditName(v: string) {
    const row = this.editRow();
    const slug = !row.slug ? this.slugify(v) : row.slug;
    this.editRow.set({ ...row, name: v, slug });
  }
  setEditSlug(v: string)       { this.editRow.set({ ...this.editRow(), slug: v }); }
  setEditImage(v: string)      { this.editRow.set({ ...this.editRow(), image: v }); }
  setEditDesc(v: string)       { this.editRow.set({ ...this.editRow(), description: v }); }
  setEditCategoryId(v: string) { this.editRow.set({ ...this.editRow(), categoryId: v ? Number(v) : null }); }

  // ===== Orden =====
  setSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }
  sortArrow(key: SortKey) {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? '▲' : '▼';
  }

  // ===== Utils =====
  trackById = (_: number, s: ViewSub) => s.id;

  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = '/assets/placeholders/subcategory.webp';
  }

  private slugify(s: string) {
    return String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private cleanCreate(src: NewSubcategory) {
    return {
      name: src.name.trim(),
      slug: (src.slug || this.slugify(src.name)).trim(),
      description: (src.description || '').trim(),
      image: (src.image || '').trim(),
      categoryId: Number(src.categoryId)
    };
  }

  private cleanEdit(src: Partial<ViewSub> & { categoryId?: number | null }) {
    const out: any = {};
    if (src.name !== undefined)        out.name = String(src.name).trim();
    if (src.slug !== undefined)        out.slug = String(src.slug).trim() || this.slugify(String(src.name ?? ''));
    if (src.description !== undefined) out.description = String(src.description).trim();
    if (src.image !== undefined)       out.image = String(src.image).trim();
    if (src.categoryId !== undefined && src.categoryId !== null) {
      out.categoryId = Number(src.categoryId);
    }
    return out;
  }

}








