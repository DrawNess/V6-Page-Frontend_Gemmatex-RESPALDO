// src/app/domains/pages/MenuMarketing/promo/promo.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { PromoService } from '@shared/services/promo.service';
import { Promo } from '@shared/models/promo.model';
@Component({
  selector: 'app-promo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './promo.component.html',
  styleUrl: './promo.component.css'
})
export class PromoComponent implements OnInit {
    promos: Promo[] = [];
  filteredPromos: Promo[] = [];

  loading = false;
  error: string | null = null;
  success: string | null = null;

  // filtros
  search = '';
  showOnlyActive = false;

  // modal
  showModal = false;
  isCreating = true;
  editingPromo: Promo | null = null;
  form: FormGroup;

  constructor(
    private promoService: PromoService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: [''],
      description: [''],
      imageUrl: ['', Validators.required], // banner 1310x361
      ctaLabel: [''],
      ctaUrl: [''],
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
    this.loadPromos();
  }

  // ----------------- CARGA Y FILTRO -----------------

  loadPromos(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    this.promoService.getAll().subscribe({
      next: (items: Promo[]) => {
        this.promos = items;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando promos', err);
        this.error = 'No se pudieron cargar las promociones.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.search.toLowerCase().trim();
    const onlyActive = this.showOnlyActive;

    this.filteredPromos = this.promos
      .filter((p) => {
        const matchesSearch =
          !term ||
          (p.title && p.title.toLowerCase().includes(term)) ||
          (p.description && p.description.toLowerCase().includes(term));

        const matchesActive = !onlyActive || p.is_active;

        return matchesSearch && matchesActive;
      })
      .sort((a, b) => {
        const ao = a.ordering ?? 9999;
        const bo = b.ordering ?? 9999;
        return ao - bo;
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
    this.editingPromo = null;
    this.showModal = true;
    this.error = null;
    this.success = null;

    this.form.reset({
      title: '',
      description: '',
      imageUrl: '',
      ctaLabel: '',
      ctaUrl: '',
      background: '',
      textColor: '',
      ordering: this.promos.length + 1,
      is_active: true,
      startAt: '',
      endAt: '',
      hrefProductId: null
    });
  }

  openEditModal(p: Promo): void {
    this.isCreating = false;
    this.editingPromo = p;
    this.showModal = true;
    this.error = null;
    this.success = null;

    this.form.reset({
      title: p.title ?? '',
      description: p.description ?? '',
      imageUrl: p.imageUrl,
      ctaLabel: p.ctaLabel ?? '',
      ctaUrl: p.ctaUrl ?? '',
      background: p.background ?? '',
      textColor: p.textColor ?? '',
      ordering: p.ordering ?? 1,
      is_active: p.is_active,
      startAt: p.startAt ? p.startAt.substring(0, 10) : '',
      endAt: p.endAt ? p.endAt.substring(0, 10) : '',
      hrefProductId: p.hrefProductId ?? null
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingPromo = null;
  }

  savePromo(): void {
    if (this.form.invalid) return;

    const v = this.form.value;

    const payload: Partial<Promo> = {
      title: v.title || undefined,
      description: v.description || undefined,
      imageUrl: v.imageUrl,
      ctaLabel: v.ctaLabel || undefined,
      ctaUrl: v.ctaUrl || undefined,
      background: v.background || undefined,
      textColor: v.textColor || undefined,
      ordering: v.ordering ?? undefined,
      is_active: v.is_active,
      startAt: v.startAt || undefined,
      endAt: v.endAt || undefined,
      hrefProductId: v.hrefProductId || undefined
    };

    if (this.isCreating) {
      this.promoService.create(payload).subscribe({
        next: () => {
          this.success = 'Promoción creada correctamente.';
          this.showModal = false;
          this.editingPromo = null;
          this.loadPromos();
        },
        error: (err) => {
          console.error('Error al crear promo', err);
          this.error = err?.error?.message || 'Error al crear promoción.';
        }
      });
    } else if (this.editingPromo) {
      this.promoService.update(this.editingPromo.id, payload).subscribe({
        next: () => {
          this.success = 'Promoción actualizada correctamente.';
          this.showModal = false;
          this.editingPromo = null;
          this.loadPromos();
        },
        error: (err) => {
          console.error('Error al actualizar promo', err);
          this.error = err?.error?.message || 'Error al actualizar promoción.';
        }
      });
    }
  }

  // ----------------- ACCIONES RÁPIDAS -----------------

  toggleActive(p: Promo): void {
    this.promoService.update(p.id, { is_active: !p.is_active }).subscribe({
      next: () => {
        this.loadPromos();
      },
      error: (err) => {
        console.error('Error al cambiar estado de promo', err);
        this.error = err?.error?.message || 'Error al cambiar el estado.';
      }
    });
  }

  deletePromo(p: Promo): void {
    const sure = confirm(`¿Eliminar la promoción "${p.title || p.id}"?`);
    if (!sure) return;

    this.promoService.delete(p.id).subscribe({
      next: () => {
        this.success = 'Promoción eliminada correctamente.';
        this.loadPromos();
      },
      error: (err) => {
        console.error('Error al eliminar promo', err);
        this.error = err?.error?.message || 'Error al eliminar promoción.';
      }
    });
  }

  // preview imagen
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.style.display = 'none';
    }
  }

  trackByPromo(_index: number, p: Promo) {
    return p.id;
  }
}
