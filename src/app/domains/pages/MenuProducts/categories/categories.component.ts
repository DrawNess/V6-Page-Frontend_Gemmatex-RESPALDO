import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { Category } from '@shared/models/category.model';

type NewCategory = {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
};

@Component({
    selector: 'app-categories',
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './categories.component.html',
    styleUrl: './categories.component.css'
})
export class CategoriesComponent {
  private http = inject(HttpClient);

  // Cambia aquí si quieres apuntar a local
  private readonly BASE = 'https://gemmatex.store/api/v1';
  // private readonly BASE = 'http://localhost:3000/api/v1';

  // Estado
  loading = signal(false);
  saving  = signal(false);
  error   = signal<string | null>(null);
  okMsg   = signal<string | null>(null);

  categories = signal<Category[]>([]);
  query = signal('');

  // edición inline
  editingId = signal<number | null>(null);
  editRow = signal<Partial<Category>>({});

  // creación
  newCat = signal<NewCategory>({
    name: '',
    slug: '',
    description: '',
    image: ''
  });

  // Lista filtrada
  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rows = this.categories().slice().sort((a,b) => a.name.localeCompare(b.name));
    if (!q) return rows;
    return rows.filter(c => {
      const hay = [c.name, c.slug, c.description].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit() { this.load(); }

  // ---------- API ----------
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<Category[]>(`${this.BASE}/categories`).subscribe({
      next: (rows) => { this.categories.set(rows ?? []); this.loading.set(false); },
      error: (e) => {
        console.error(e);
        this.error.set('No se pudieron cargar las categorías.');
        this.loading.set(false);
      }
    });
  }

  create() {
    const src = this.newCat();
    if (!src.name?.trim()) {
      this.error.set('El nombre es obligatorio.');
      return;
    }
    const payload = this.cleanCreate(src);
    this.saving.set(true);
    this.error.set(null);
    this.okMsg.set(null);

    this.http.post<Category>(`${this.BASE}/categories`, payload).subscribe({
      next: (created) => {
        this.categories.update(list => [created, ...list]);
        this.newCat.set({ name: '', slug: '', description: '', image: '' });
        this.okMsg.set('Categoría creada.');
        this.saving.set(false);
      },
      error: (e) => {
        console.error(e);
        this.error.set('No se pudo crear la categoría.');
        this.saving.set(false);
      }
    });
  }

  startEdit(row: Category) {
    this.editingId.set(row.id);
    this.editRow.set({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      image: row.image
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
    if (!src.name?.trim()) {
      this.error.set('El nombre es obligatorio.');
      return;
    }
    const payload = this.cleanEdit(src);
    this.saving.set(true);
    this.error.set(null);
    this.okMsg.set(null);

    // Optimista
    const prev = this.categories();
    const idx = prev.findIndex(c => c.id === id);
    const backup = idx >= 0 ? { ...prev[idx] } : null;

    if (idx >= 0) {
      const merged: Category = { ...prev[idx], ...payload };
      this.categories.update(arr => {
        const copy = arr.slice();
        copy[idx] = merged;
        return copy;
      });
    }

    this.http.patch<Category>(`${this.BASE}/categories/${id}`, payload).subscribe({
      next: (updated) => {
        if (idx >= 0) {
          this.categories.update(arr => {
            const copy = arr.slice();
            copy[idx] = updated;
            return copy;
          });
        }
        this.okMsg.set('Categoría actualizada.');
        this.saving.set(false);
        this.cancelEdit();
      },
      error: (e) => {
        console.error(e);
        if (idx >= 0 && backup) {
          this.categories.update(arr => {
            const copy = arr.slice();
            copy[idx] = backup!;
            return copy;
          });
        }
        this.error.set('No se pudo actualizar la categoría.');
        this.saving.set(false);
      }
    });
  }

  remove(row: Category) {
    if (!confirm(`¿Eliminar la categoría "${row.name}"?`)) return;
    const id = row.id;

    // Optimista
    const prev = this.categories();
    this.categories.set(prev.filter(c => c.id !== id));

    this.http.delete<void>(`${this.BASE}/categories/${id}`).subscribe({
      next: () => { this.okMsg.set('Categoría eliminada.'); },
      error: (e) => {
        console.error(e);
        this.categories.set(prev);
        this.error.set('No se pudo eliminar (ver si tiene subcategorías/productos).');
      }
    });
  }

  // ---------- helpers ----------
  trackById = (_: number, c: Category) => c.id;

  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = '/assets/placeholders/category.webp';
  }

  // Slug por defecto
  private slugify(s: string) {
    return String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private cleanCreate(src: NewCategory) {
    return {
      name: (src.name || '').trim(),
      slug: (src.slug?.trim() || this.slugify(src.name || '')),
      description: (src.description || '').trim(),
      image: (src.image || '').trim()
    };
  }

  private cleanEdit(src: Partial<Category>) {
    const out: any = {};
    if (src.name !== undefined)        out.name = String(src.name).trim();
    if (src.slug !== undefined)        out.slug = String(src.slug).trim() || this.slugify(String(src.name ?? ''));
    if (src.description !== undefined) out.description = String(src.description).trim();
    if (src.image !== undefined)       out.image = String(src.image).trim();
    return out;
  }

  // ===== setters para CREAR/EDITAR =====
  onNameInputCreate(val: string) {
    this.newCat.update(v => {
      const next = { ...v, name: val };
      if (!v.slug) next.slug = this.slugify(val); // autocompleta slug si estaba vacío
      return next;
    });
  }
  setNewField<K extends keyof NewCategory>(key: K, val: NewCategory[K]) {
    this.newCat.update(v => ({ ...v, [key]: val }));
  }

  onNameInputEdit(val: string) {
    this.editRow.update(v => {
      const next = { ...v, name: val };
      if (!v.slug) (next as any).slug = this.slugify(val);
      return next;
    });
  }
  setEditField<K extends keyof Category>(key: K, val: any) {
    this.editRow.update(v => ({ ...v, [key]: val }));
  }
}
