// src/app/domains/pages/MenuProducts/products/products.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { SubcategoryService } from '@shared/services/subcategory.service';

import { Product } from '@shared/models/product.model';
import { Category } from '@shared/models/category.model';
import { Subcategory } from '@shared/models/subcategory.model';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';


@Component({
    selector: 'app-products',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
    templateUrl: './products.component.html',
    styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {

  products: Product[] = [];
  filteredProducts: Product[] = [];

  categories: Category[] = [];
  subcategories: Subcategory[] = [];

  loading = false;
  error: string | null = null;
  success: string | null = null;

  filters = {
    categoryId: '',
    subcategoryId: '',
    search: '',
    showOnlyActive: false
  };

  // Modal de edición
  showEditModal = false;
  editingProduct: Product | null = null;
  form: FormGroup;

  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private subcategoryService: SubcategoryService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      brand: [''],
      imageUrl: ['']
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  // ----------------- CARGAS INICIALES -----------------

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (cats: Category[]) => {
        this.categories = cats;
      },
      error: (err) => {
        console.error('Error cargando categorías', err);
        this.error = 'No se pudieron cargar las categorías.';
      }
    });
  }

  loadSubcategories(): void {
    if (!this.filters.categoryId) {
      this.subcategories = [];
      this.filters.subcategoryId = '';
      return;
    }

    // categorías/:id/subcategories
    this.subcategoryService.getByCategory(this.filters.categoryId).subscribe({
      next: (subs: Subcategory[]) => {
        this.subcategories = subs;
      },
      error: (err) => {
        console.error('Error cargando subcategorías', err);
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    // 👇 AQUÍ ESTABA EL PROBLEMA
    // Antes: this.productService.getProducts(this.filters.categoryId)
    // Ahora usamos el endpoint correcto: /categories/:id/products
    const obs = this.filters.categoryId
      ? this.categoryService.getProductsByCategory(this.filters.categoryId)
      : this.productService.getProductos();

    obs.subscribe({
      next: (prods: Product[]) => {
        this.products = prods;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando productos', err);
        this.error = 'No se pudieron cargar los productos.';
        this.loading = false;
      }
    });
  }

  // ----------------- FILTROS -----------------

  onCategoryChange(): void {
    this.loadSubcategories();
    this.loadProducts();   // vuelve a pedir los productos pero ahora por categoría
  }

  onSubcategoryChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onToggleActive(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.filters.search.toLowerCase().trim();
    const subId = this.filters.subcategoryId;
    const onlyActive = this.filters.showOnlyActive;

    this.filteredProducts = this.products.filter((p) => {
      const variantSkus = (p.variants ?? []).map(v => v.sku.toLowerCase()).join(' ');
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        variantSkus.includes(term);

      const matchesSubcat =
        !subId ||
        (p.subcategory && String((p.subcategory as any).id) === subId);

      const matchesActive = !onlyActive || p.is_active;

      return matchesSearch && matchesSubcat && matchesActive;
    });
  }

  // ----------------- MODAL DE EDICIÓN -----------------

  openEditModal(product: Product): void {
    this.editingProduct = product;
    this.showEditModal = true;
    this.error = null;
    this.success = null;

    this.form.reset({
      name: product.name,
      brand: product.brand,
      imageUrl: product.imageUrl
    });
  }



  closeEditModal(): void {
    this.showEditModal = false;
    this.editingProduct = null;
  }

  saveEdit(): void {
    if (!this.editingProduct || this.form.invalid) {
      return;
    }

    const formValues = this.form.value;

    const body = {
      name: formValues.name,
      brand: formValues.brand,
      imageUrl: formValues.imageUrl
    };

    this.productService.patchProduct(this.editingProduct.id, body).subscribe({
      next: () => {
        this.showEditModal = false;
        this.editingProduct = null;
        this.success = 'Producto actualizado correctamente.';
        this.loadProducts();
      },
      error: (err) => {
        console.error('Error al actualizar el producto', err);
        this.error = err?.error?.message || 'Error al actualizar el producto.';
      }
    });
  }


  // ----------------- ACCIONES RÁPIDAS -----------------

  toggleActive(product: Product): void {
    // De momento NO podemos cambiar is_active porque el backend no lo acepta
    alert(
      'El backend actualmente NO permite modificar el campo "is_active" (devuelve `"is_active" is not allowed"`). ' +
      'Hay que agregar ese campo en el esquema de validación del PATCH para poder usar esta acción.'
    );
  }

  delete(product: Product): void {
    const sure = confirm(`¿Eliminar el producto "${product.name}"?`);
    if (!sure) return;

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.success = 'Producto eliminado correctamente.';
        this.loadProducts();
      },
      error: (err) => {
        console.error('Error al eliminar el producto', err);
        this.error = err?.error?.message || 'Error al eliminar el producto.';
      }
    });
  }

  goToVariants(productId: number): void {
    this.router.navigate(
      [this.adminBase, ROUTE_CONSTANTS.ADMIN.VARIANTS],
      { queryParams: { productId } }
    );
  }

  // Manejo de error en la imagen
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.style.display = 'none';
    }
  }
}
