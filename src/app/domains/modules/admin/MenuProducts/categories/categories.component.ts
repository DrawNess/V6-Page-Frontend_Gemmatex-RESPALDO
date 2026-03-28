import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '@shared/services/category.service';
import { Category } from '@shared/models/category.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent {
  private svc = inject(CategoryService);

  loading = signal(false);
  saving = signal(false);
  toast = signal<{ type: 'ok' | 'err'; msg: string } | null>(null);

  categories = signal<Category[]>([]);
  query = signal('');

  // Modal
  modalOpen = signal(false);
  modalMode = signal<'create' | 'edit'>('create');
  form = signal<Partial<Category> & { name: string }>({ name: '', slug: '', description: '', image: '' });
  editId = signal<number | null>(null);

  // Delete confirmation
  deleteTarget = signal<Category | null>(null);

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const rows = this.categories().slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return rows;
    return rows.filter(c =>
      [c.name, c.slug, c.description].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: rows => { this.categories.set(rows ?? []); this.loading.set(false); },
      error: () => { this.showToast('err', 'No se pudieron cargar las categorías.'); this.loading.set(false); }
    });
  }

  // Modal actions
  openCreate() {
    this.modalMode.set('create');
    this.editId.set(null);
    this.form.set({ name: '', slug: '', description: '', image: '' });
    this.modalOpen.set(true);
  }

  openEdit(c: Category) {
    this.modalMode.set('edit');
    this.editId.set(c.id);
    this.form.set({ name: c.name, slug: c.slug, description: c.description ?? '', image: c.image ?? '' });
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  save() {
    const f = this.form();
    if (!f.name.trim()) { this.showToast('err', 'El nombre es obligatorio.'); return; }

    const payload = {
      name: f.name.trim(),
      slug: f.slug?.trim() || this.slugify(f.name),
      description: (f.description ?? '').trim(),
      image: (f.image ?? '').trim()
    };

    this.saving.set(true);

    if (this.modalMode() === 'create') {
      this.svc.create(payload).subscribe({
        next: created => {
          this.categories.update(list => [created, ...list]);
          this.showToast('ok', 'Categoría creada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo crear.'); this.saving.set(false); }
      });
    } else {
      const id = this.editId()!;
      this.svc.update(id, payload).subscribe({
        next: updated => {
          this.categories.update(list => list.map(c => c.id === id ? updated : c));
          this.showToast('ok', 'Categoría actualizada.');
          this.saving.set(false);
          this.closeModal();
        },
        error: () => { this.showToast('err', 'No se pudo actualizar.'); this.saving.set(false); }
      });
    }
  }

  // Delete
  confirmDelete(c: Category) {
    this.deleteTarget.set(c);
  }

  cancelDelete() {
    this.deleteTarget.set(null);
  }

  executeDelete() {
    const c = this.deleteTarget();
    if (!c) return;
    const prev = this.categories();
    this.categories.set(prev.filter(x => x.id !== c.id));
    this.deleteTarget.set(null);

    this.svc.delete(c.id).subscribe({
      next: () => this.showToast('ok', `"${c.name}" eliminada.`),
      error: () => {
        this.categories.set(prev);
        this.showToast('err', 'No se pudo eliminar (puede tener subcategorías/productos).');
      }
    });
  }

  // Helpers
  onNameInput(val: string) {
    this.form.update(f => ({
      ...f,
      name: val,
      slug: f.slug ? f.slug : this.slugify(val)
    }));
  }

  setField<K extends keyof Category>(key: K, val: unknown) {
    this.form.update(f => ({ ...f, [key]: val }));
  }

  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%23e2e8f0"/></svg>';
  }

  trackById = (_: number, c: Category) => c.id;

  private slugify(s: string) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private showToast(type: 'ok' | 'err', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
