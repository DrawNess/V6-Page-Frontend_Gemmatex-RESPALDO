import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { AnnouncementService } from '@shared/services/announcement.service';
import { Announcement } from '@shared/models/announcement.model';

@Component({
    selector: 'app-offers-adds',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './offers-adds.component.html',
    styleUrl: './offers-adds.component.css'
})
export class OffersAddsComponent {
  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];

  loading = false;
  error: string | null = null;
  success: string | null = null;

  // filtros
  search = '';
  showOnlyActive = false;

  // modal
  showModal = false;
  isCreating = true;
  editingAnnouncement: Announcement | null = null;
  form: FormGroup;

  constructor(
    private announcementService: AnnouncementService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      linkLabel: [''],
      linkUrl: [''],
      background: [''],
      textColor: [''],
      ordering: [1],
      is_active: [true],
      startAt: [''],
      endAt: [''],
      hrefProductId: [null]
    });
  }

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  // ----------------- CARGA Y FILTRO -----------------

  loadAnnouncements(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    this.announcementService.getAll().subscribe({
      next: (items: Announcement[]) => {
        this.announcements = items;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando announcements', err);
        this.error = 'No se pudieron cargar los anuncios.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.search.toLowerCase().trim();
    const onlyActive = this.showOnlyActive;

    this.filteredAnnouncements = this.announcements.filter((a) => {
      const matchesSearch =
        !term ||
        a.title.toLowerCase().includes(term) ||
        (a.description && a.description.toLowerCase().includes(term));

      const matchesActive = !onlyActive || a.is_active;

      return matchesSearch && matchesActive;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onToggleActiveFilter(): void {
    this.applyFilters();
  }

  // ----------------- MODAL: CREAR / EDITAR -----------------

  openCreateModal(): void {
    this.isCreating = true;
    this.editingAnnouncement = null;
    this.showModal = true;
    this.error = null;
    this.success = null;

    this.form.reset({
      title: '',
      description: '',
      linkLabel: '',
      linkUrl: '',
      background: '',
      textColor: '',
      ordering: this.announcements.length + 1,
      is_active: true,
      startAt: '',
      endAt: '',
      hrefProductId: null
    });
  }

  openEditModal(a: Announcement): void {
    this.isCreating = false;
    this.editingAnnouncement = a;
    this.showModal = true;
    this.error = null;
    this.success = null;

    this.form.reset({
      title: a.title,
      description: a.description ?? '',
      linkLabel: a.linkLabel ?? '',
      linkUrl: a.linkUrl ?? '',
      background: a.background ?? '',
      textColor: a.textColor ?? '',
      ordering: a.ordering ?? 1,
      is_active: a.is_active,
      startAt: a.startAt ? a.startAt.substring(0, 10) : '',
      endAt: a.endAt ? a.endAt.substring(0, 10) : '',
      hrefProductId: a.hrefProductId ?? null
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingAnnouncement = null;
  }

  saveAnnouncement(): void {
    if (this.form.invalid) return;

    const v = this.form.value;

    const payload: Partial<Announcement> = {
      title: v.title,
      description: v.description || undefined,
      linkLabel: v.linkLabel || undefined,
      linkUrl: v.linkUrl || undefined,
      background: v.background || undefined,
      textColor: v.textColor || undefined,
      ordering: v.ordering ?? undefined,
      is_active: v.is_active,
      startAt: v.startAt || undefined,
      endAt: v.endAt || undefined,
      hrefProductId: v.hrefProductId || undefined
    };

    if (this.isCreating) {
      this.announcementService.create(payload).subscribe({
        next: () => {
          this.success = 'Anuncio creado correctamente.';
          this.showModal = false;
          this.editingAnnouncement = null;
          this.loadAnnouncements();
        },
        error: (err) => {
          console.error('Error al crear anuncio', err);
          this.error = err?.error?.message || 'Error al crear anuncio.';
        }
      });
    } else if (this.editingAnnouncement) {
      this.announcementService.update(this.editingAnnouncement.id, payload).subscribe({
        next: () => {
          this.success = 'Anuncio actualizado correctamente.';
          this.showModal = false;
          this.editingAnnouncement = null;
          this.loadAnnouncements();
        },
        error: (err) => {
          console.error('Error al actualizar anuncio', err);
          this.error = err?.error?.message || 'Error al actualizar anuncio.';
        }
      });
    }
  }

  // ----------------- ACCIONES RÁPIDAS -----------------

  toggleActive(a: Announcement): void {
    this.announcementService.update(a.id, { is_active: !a.is_active }).subscribe({
      next: () => {
        this.loadAnnouncements();
      },
      error: (err) => {
        console.error('Error al cambiar estado de anuncio', err);
        this.error = err?.error?.message || 'Error al cambiar el estado.';
      }
    });
  }

  deleteAnnouncement(a: Announcement): void {
    const sure = confirm(`¿Eliminar el anuncio "${a.title}"?`);
    if (!sure) return;

    this.announcementService.delete(a.id).subscribe({
      next: () => {
        this.success = 'Anuncio eliminado correctamente.';
        this.loadAnnouncements();
      },
      error: (err) => {
        console.error('Error al eliminar anuncio', err);
        this.error = err?.error?.message || 'Error al eliminar anuncio.';
      }
    });
  }

}
