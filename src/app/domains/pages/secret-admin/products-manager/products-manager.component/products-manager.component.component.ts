import { Component, inject, signal, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService } from '@shared/services/product.service';
import { Product } from '@shared/models/product.model';
import { SECRET_BASE } from './../../../../../app.routes';

@Component({
  selector: 'app-products-manager.component',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './products-manager.component.component.html',
  styleUrl: './products-manager.component.component.css'
})
export class ProductsManagerComponentComponent {

   private fb = inject(FormBuilder);
  private productService = inject(ProductService);

  // estado
  loading = signal(false);
  ok = signal<string | null>(null);
  err = signal<string | null>(null);

  // datos
  products = signal<Product[]>([]);
  search = signal('');

  // modal edición
  editing = signal<Product | null>(null);
  showModal = signal(false);

  // form edición (PATCH)
  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    price: [0, [Validators.required, Validators.min(0)]],
    discountPrice: [null],
    imageUrl: ['', Validators.required],
    category: [null],
    subcategory: [''],
    stock: [0, [Validators.min(0)]],
    is_active: [true],
    shortDescription: [''],
    description: [''],
    tags: ['']
  });

  // filtro
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p => {
      const s = [
        p.name ?? '',
        (p as any).shortDescription ?? '',
        (p as any).description ?? '',
        ...(p.tags ?? [])
      ].join(' ').toLowerCase();
      return s.includes(q);
    });
  });

  base = `/${SECRET_BASE}/menu-secreto`;

  constructor() { this.load(); }

  // helpers para template (evita NG5002)
  onSearchInput(val: string) { this.search.set(val); }

  // cargar
  load() {
    this.loading.set(true);
    this.productService.getProducts().subscribe({
      next: list => { this.products.set(list ?? []); this.loading.set(false); },
      error: () => { this.err.set('No se pudieron cargar los productos'); this.loading.set(false); }
    });
  }

  // abrir editar
  openEdit(p: Product) {
    this.editing.set(p);
    this.form.reset({
      name: p.name ?? '',
      price: p.price ?? 0,
      discountPrice: (p as any).discountPrice ?? null,
      imageUrl: p.imageUrl ?? '',
      category: Number((p as any).category) || null,
      subcategory: (p as any).subcategory ?? '',
      stock: (p as any).stock ?? 0,
      is_active: (p as any).is_active ?? true,
      shortDescription: (p as any).shortDescription ?? '',
      description: (p as any).description ?? '',
      tags: (p.tags ?? []).join(',')
    });
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  // PATCH guardar
  save() {
    const ed = this.editing();
    if (!ed) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();
    const partial: any = {
      name: v['name'],
      price: Number(v['price'] ?? 0),
      discountPrice: v['discountPrice'] !== null && v['discountPrice'] !== '' ? Number(v['discountPrice']) : null,
      imageUrl: v['imageUrl'],
      category: v['category'] !== null && v['category'] !== '' ? Number(v['category']) : null,
      subcategory: (v['subcategory'] ?? '').toString(),
      stock: Number(v['stock'] ?? 0),
      is_active: !!v['is_active'],
      shortDescription: v['shortDescription'] ?? '',
      description: v['description'] ?? '',
      tags: (v['tags'] ?? '').split(',').map((x: string) => x.trim()).filter((x: string) => !!x)
    };

    this.loading.set(true);
    this.productService.patchProduct(ed.id, partial).subscribe({
      next: updated => {
        this.products.update(prev => prev.map(x => x.id === ed.id ? updated : x));
        this.ok.set('Actualizado correctamente');
        this.loading.set(false);
        this.closeModal();
      },
      error: () => { this.err.set('Error al actualizar'); this.loading.set(false); }
    });
  }

  // Soft delete (toggle is_active)
  toggleActive(p: Product) {
    const next = !(p as any).is_active;
    this.loading.set(true);
    this.productService.patchProduct(p.id, { is_active: next }).subscribe({
      next: updated => {
        this.products.update(prev => prev.map(x => x.id === p.id ? updated : x));
        this.ok.set(next ? 'Producto activado' : 'Producto desactivado');
        this.loading.set(false);
      },
      error: () => { this.err.set('No se pudo cambiar el estado'); this.loading.set(false); }
    });
  }
  trackById = (_: number, item: Product) => item.id;
  /* trackById(index: number, item: Product): number {
    return item.id;
  } */
}
