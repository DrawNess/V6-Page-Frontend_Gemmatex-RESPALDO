// src/app/domains/pages/MenuMarketing/hero-slides/hero-slides.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import { HeroSlideService } from '@shared/services/hero-slide.service';
import { HeroSlide } from '@shared/models/hero-slide.model';

@Component({
    selector: 'app-hero-slides',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './hero-slides.component.html',
    styleUrl: './hero-slides.component.css'
})
export class HeroSlidesComponent {
    slides: HeroSlide[] = [];
  filteredSlides: HeroSlide[] = [];

  loading = false;
  error: string | null = null;
  success: string | null = null;

  // filtros
  search = '';
  showOnlyActive = false;

  // modal
  showModal = false;
  isCreating = true;
  editingSlide: HeroSlide | null = null;
  form: FormGroup;

  constructor(
    private heroSlideService: HeroSlideService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: [''],
      subtitle: [''],
      description: [''],
      imageUrl: ['', Validators.required],
      mobileImageUrl: [''],
      ctaLabel: [''],
      ctaUrl: [''],
      background: [''],
      textColor: [''],
      ordering: [1],
      is_active: [true],
      startAt: [''],      // yyyy-MM-dd
      endAt: [''],        // yyyy-MM-dd
      hrefProductId: [null]
    });
  }

  ngOnInit(): void {
    this.loadSlides();
  }

  // ----------------- CARGA Y FILTRO -----------------

  loadSlides(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    this.heroSlideService.getAll().subscribe({
      next: (items: HeroSlide[]) => {
        this.slides = items;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando hero slides', err);
        this.error = 'No se pudieron cargar los hero slides.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.search.toLowerCase().trim();
    const onlyActive = this.showOnlyActive;

    this.filteredSlides = this.slides.filter((s) => {
      const matchesSearch =
        !term ||
        (s.title && s.title.toLowerCase().includes(term)) ||
        (s.subtitle && s.subtitle.toLowerCase().includes(term)) ||
        (s.description && s.description.toLowerCase().includes(term));

      const matchesActive = !onlyActive || s.is_active;

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
    this.editingSlide = null;
    this.showModal = true;
    this.error = null;
    this.success = null;

    this.form.reset({
      title: '',
      subtitle: '',
      description: '',
      imageUrl: '',
      mobileImageUrl: '',
      ctaLabel: '',
      ctaUrl: '',
      background: '',
      textColor: '',
      ordering: this.slides.length + 1,
      is_active: true,
      startAt: '',
      endAt: '',
      hrefProductId: null
    });
  }

  openEditModal(slide: HeroSlide): void {
    this.isCreating = false;
    this.editingSlide = slide;
    this.showModal = true;
    this.error = null;
    this.success = null;

    // startAt / endAt pueden venir en ISO; si tienen formato distinto, puedes limpiarlos
    this.form.reset({
      title: slide.title ?? '',
      subtitle: slide.subtitle ?? '',
      description: slide.description ?? '',
      imageUrl: slide.imageUrl,
      mobileImageUrl: slide.mobileImageUrl ?? '',
      ctaLabel: slide.ctaLabel ?? '',
      ctaUrl: slide.ctaUrl ?? '',
      background: slide.background ?? '',
      textColor: slide.textColor ?? '',
      ordering: slide.ordering ?? 1,
      is_active: slide.is_active,
      startAt: slide.startAt ? slide.startAt.substring(0, 10) : '',
      endAt: slide.endAt ? slide.endAt.substring(0, 10) : '',
      hrefProductId: slide.hrefProductId ?? null
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingSlide = null;
  }

  saveSlide(): void {
    if (this.form.invalid) {
      return;
    }

    const v = this.form.value;

    const payload: Partial<HeroSlide> = {
      title: v.title || undefined,
      subtitle: v.subtitle || undefined,
      description: v.description || undefined,
      imageUrl: v.imageUrl,
      mobileImageUrl: v.mobileImageUrl || undefined,
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
      this.heroSlideService.create(payload).subscribe({
        next: () => {
          this.success = 'Hero slide creado correctamente.';
          this.showModal = false;
          this.editingSlide = null;
          this.loadSlides();
        },
        error: (err) => {
          console.error('Error al crear hero slide', err);
          this.error = err?.error?.message || 'Error al crear hero slide.';
        }
      });
    } else if (this.editingSlide) {
      this.heroSlideService.update(this.editingSlide.id, payload).subscribe({
        next: () => {
          this.success = 'Hero slide actualizado correctamente.';
          this.showModal = false;
          this.editingSlide = null;
          this.loadSlides();
        },
        error: (err) => {
          console.error('Error al actualizar hero slide', err);
          this.error = err?.error?.message || 'Error al actualizar hero slide.';
        }
      });
    }
  }

  // ----------------- ACCIONES RÁPIDAS -----------------

  toggleActive(slide: HeroSlide): void {
    this.heroSlideService.update(slide.id, { is_active: !slide.is_active }).subscribe({
      next: () => {
        this.loadSlides();
      },
      error: (err) => {
        console.error('Error al cambiar estado de hero slide', err);
        this.error = err?.error?.message || 'Error al cambiar el estado.';
      }
    });
  }

  deleteSlide(slide: HeroSlide): void {
    const sure = confirm(`¿Eliminar el hero slide "${slide.title || slide.id}"?`);
    if (!sure) return;

    this.heroSlideService.delete(slide.id).subscribe({
      next: () => {
        this.success = 'Hero slide eliminado correctamente.';
        this.loadSlides();
      },
      error: (err) => {
        console.error('Error al eliminar hero slide', err);
        this.error = err?.error?.message || 'Error al eliminar hero slide.';
      }
    });
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.style.display = 'none';
    }
  }

}
