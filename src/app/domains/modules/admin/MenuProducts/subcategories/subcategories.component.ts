import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '@shared/services/category.service';
import { SubcategoryService } from '@shared/services/subcategory.service';
import { Category } from '@shared/models/category.model';
import { Subcategory } from '@shared/models/subcategory.model';

type ViewSub = Omit<Subcategory, 'category'> & {
  category?: Category;
  categoryId?: number | null;
};

type SortKey = 'id' | 'name' | 'slug' | 'category' | 'createdAt';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-subcategories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subcategories.component.html',
  styleUrl: './subcategories.component.css'
})
export class SubcategoriesComponent {
  private catSvc = inject(CategoryService);
  private subSvc = inject(SubcategoryService);

  loading = signal(false);
  saving = signal(false);
  toast = signal<{ type: 'ok' | 'err'; msg: string } | null>(null);

  categories = signal<Category[]>([]);
  subcategories = signal<ViewSub[]>([]);

  query = signal('');
  categoryFilter = signal<number | ''>('');
  sortKey = signal<SortKey>('name');
  sortDir = signal<SortDir>('asc');

  // Modal
  modalOpen = signal(false);
  modalMode = signal<'create' | 'edit'>('create');
  form = signal<{ name: string; slug: string; description: string; image: string; categoryId: number | null }>({
    name: '', slug: '', description: '', image: '', categoryId: null
  });
  editId = signal<number | null>(null);

  deleteTarget = signal<ViewSub | null>(null);

  private catMap = computed(() => {
    const map = new Map<number, Category>();
    for (const c of this.categories()) map.set(c.id, c);
    return map;
  });

  filteredSorted = computed(() => {
    const q = this.query().trim().toLowerCase();
    const fCat = this.categoryFilter();
    const key = this.sortKey();
    const dir = this.sortDir();

    let rows = this.subcategories().slice();
    if (fCat !== '') rows = rows.filter(r => (r.categoryId ?? r.category?.id) === Number(fCat));
    if (q) rows = rows.filter(s => [s.name, s.slug, s.description, s.category?.name].filter(Boolean).join(' ').toLowerCase().includes(q));

    rows.sort((a, b) => {
      let A: string | number = ''; let B: string | number = '';
      switch (key) {
        case 'id': A = a.id; B = b.id; break;
        case 'name': A = (a.name || '').toLowerCase(); B = (b.name || '').toLowerCase(); break;
        case 'slug': A = (a.slug || '').toLowerCase(); B = (b.slug || '').toLowerCase(); break;
        case 'category': A = (a.category?.name || '').toLowerCase(); B = (b.category?.name || '').toLowerCase(); break;
        case 'createdAt': A = a.createdAt || ''; B = b.createdAt || ''; break;
      }
      if (A < B) return dir === 'asc' ? -1 : 1;
      if (A > B) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  });

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.catSvc.getAll().subscribe({
      next: cats => {
        this.categories.set(cats ?? []);
        this.subSvc.getAll().subscribe({
          next: subs => {
            const cmap = new Map((cats ?? []).map(c => [c.id, c]));
            this.subcategories.set((subs ?? []).map((s: any) => {
              const cid = Number(s.categoryId ?? s.category?.id ?? NaN);
              return { ...s, categoryId: Number.isFinite(cid) ? cid : null, category: Number.isFinite(cid) ? cmap.get(cid) ?? s.category : s.category };
            }));
            this.loading.set(false);
          },
          error: () => { this.showToast('err', 'No se pudieron cargar subcategorías.'); this.loading.set(false); }
        });
      },
      error: () => { this.showToast('err', 'No se pudieron cargar categorías.'); this.loading.set(false); }
    });
  }

  // Modal
  openCreate() {
    this.modalMode.set('create');
    this.editId.set(null);
    this.form.set({ name: '', slug: '', description: '', image: '', categoryId: null });
    this.modalOpen.set(true);
  }

  openEdit(s: ViewSub) {
    this.modalMode.set('edit');
    this.editId.set(s.id);
    this.form.set({
      name: s.name, slug: s.slug,
      description: s.description ?? '', image: s.image ?? '',
      categoryId: s.categoryId ?? s.category?.id ?? null
    });
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  save() {
    const f = this.form();
    if (!f.name.trim()) { this.showToast('err', 'El nombre es obligatorio.'); return; }
    if (!f.categoryId) { this.showToast('err', 'Seleccione una categoría.'); return; }

    const payload = {
      name: f.name.trim(),
      slug: f.slug.trim() || this.slugify(f.name),
      description: f.description.trim(),
      image: f.image.trim(),
      categoryId: Number(f.categoryId)
    };

    this.saving.set(true);

    if (this.modalMode() === 'create') {
      this.subSvc.create(payload as any).subscribe({
        next: created => {
          const cid = (created as any).categoryId ?? payload.categoryId;
          const view: ViewSub = { ...created as any, categoryId: cid, category: this.catMap().get(Number(cid)) };
          this.subcategories.update(list => [view, ...list]);
          this.showToast('ok', 'Subcategoría creada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo crear.'); this.saving.set(false); }
      });
    } else {
      const id = this.editId()!;
      this.subSvc.update(id, payload as any).subscribe({
        next: updated => {
          const cid = (updated as any).categoryId ?? payload.categoryId;
          const view: ViewSub = { ...updated as any, categoryId: cid, category: this.catMap().get(Number(cid)) };
          this.subcategories.update(list => list.map(s => s.id === id ? view : s));
          this.showToast('ok', 'Subcategoría actualizada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo actualizar.'); this.saving.set(false); }
      });
    }
  }

  // Delete
  confirmDelete(s: ViewSub) { this.deleteTarget.set(s); }
  cancelDelete() { this.deleteTarget.set(null); }

  executeDelete() {
    const s = this.deleteTarget();
    if (!s) return;
    const prev = this.subcategories();
    this.subcategories.set(prev.filter(x => x.id !== s.id));
    this.deleteTarget.set(null);
    this.subSvc.delete(s.id).subscribe({
      next: () => this.showToast('ok', `"${s.name}" eliminada.`),
      error: () => { this.subcategories.set(prev); this.showToast('err', 'No se pudo eliminar.'); }
    });
  }

  // Sorting
  setSort(key: SortKey) {
    if (this.sortKey() === key) this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    else { this.sortKey.set(key); this.sortDir.set('asc'); }
  }
  sortArrow(key: SortKey) {
    if (this.sortKey() !== key) return '';
    return this.sortDir() === 'asc' ? ' ↑' : ' ↓';
  }

  // Form helpers
  onNameInput(val: string) {
    this.form.update(f => ({ ...f, name: val, slug: f.slug ? f.slug : this.slugify(val) }));
  }
  setField(key: string, val: unknown) {
    this.form.update(f => ({ ...f, [key]: val }));
  }
  setCategoryId(val: string) {
    this.form.update(f => ({ ...f, categoryId: val ? Number(val) : null }));
  }

  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23e2e8f0"/></svg>';
  }

  trackById = (_: number, s: ViewSub) => s.id;

  private slugify(s: string) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private showToast(type: 'ok' | 'err', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
