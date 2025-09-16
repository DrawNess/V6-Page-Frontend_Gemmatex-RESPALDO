import {
  Component, Input, SimpleChanges, inject, signal,
  ElementRef, ViewChild, OnInit, OnDestroy, OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ProductComponent } from '@products/components/product/product.component';
import { Product } from '@shared/models/product.model';
import { Category } from '@shared/models/category.model';

import { CartService } from '@shared/services/cart.service';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';

import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';


@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export default class ListComponent implements OnInit, OnDestroy, OnChanges {

private toProduct(x: any): Product {
  return {
    id: Number(x.id),
    name: x.name,
    slug: x.slug ?? (x.name ? String(x.name).toLowerCase().replace(/\s+/g,'-') : ''),
    description: x.description ?? '',
    shortDescription: x.shortDescription ?? x.short_description ?? '',
    subcategory: x.subcategory ?? x.subcategory_name ?? '',
    imageUrl: x.imageUrl ?? x.image_url ?? '',
    galleryUrls: x.galleryUrls ?? x.gallery_urls ?? [],
    price: Number(x.price ?? 0),
    discountPrice: Number(x.discountPrice ?? x.discount_price ?? 0),
    sku: x.sku ?? '',
    stock: Number(x.stock ?? 0),
    unitOfMeasure: Number(x.unitOfMeasure ?? x.unit_of_measure ?? 0),
    dimensions: Number(x.dimensions ?? 0),
    tags: Array.isArray(x.tags) ? x.tags : (typeof x.tags === 'string' ? x.tags.split(',').map((t:string)=>t.trim()) : []),
    is_active: Boolean(x.is_active ?? x.isActive ?? true),
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    updated_at: x.updated_at ?? x.updatedAt ?? new Date().toISOString(),
    category: x.category
  } as Product;
}


  // --------- Inputs (filtro por categoría, si aplica) ----------
  @Input() category_id?: string;

  // --------- Estado ----------
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  randomProducts = signal<Product[]>([]);

  // --------- Servicios ----------
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  // --------- Hero ----------
  heroUrl = 'https://iili.io/Fy4LpkP.jpg';
  heroAlt = 'Fondo de impresión y sublimación';

  // --------- Carrusel "Descubre más productos" ----------
  @ViewChild('carouselTrack', { static: false }) track?: ElementRef<HTMLDivElement>;
  private timer: any = null;
  private intervalMs = 3500;

  // --------- Ciclo de vida ----------
  ngOnInit() {
    this.getCategories();
    this.loadRandom(12); // carga y arma el carrusel
    this.loadFeaturedByIds();
  }

  ngOnChanges(_: SimpleChanges) {

    this.getProducts();
  }

  ngOnDestroy() {
    this.pauseAutoplay();
  }

  // --------- Data ----------
  private getProducts() {
    this.productService.getProducts(this.category_id).subscribe({
      next: (items) => this.products.set(items ?? []),
      error: () => this.products.set([])
    });
  }

  private getCategories() {
    this.categoryService.getAll().subscribe({
      next: (data) => this.categories.set(data ?? []),
      error: () => this.categories.set([])
    });
  }

  private loadRandom(n: number) {
    this.productService.getProducts().subscribe({
      next: (items) => {
        const list = items ?? [];
        // shuffle (Fisher–Yates)
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        this.randomProducts.set(list.slice(0, Math.min(n, list.length)));
        this.restartAutoplay();
      },
      error: () => this.randomProducts.set([])
    });
  }

  // --------- Carrusel: navegación ----------
  private stepPx(): number {
    const el = this.track?.nativeElement;
    if (!el) return 0;
    const first = el.querySelector<HTMLElement>('.slide');
    if (!first) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0');
    return first.clientWidth + gap; // avanzar 1 tarjeta
  }

  nextSlide() {
    const el = this.track?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: this.stepPx(), behavior: 'smooth' });
    this.restartAutoplay();
  }

  prevSlide() {
    const el = this.track?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: -this.stepPx(), behavior: 'smooth' });
    this.restartAutoplay();
  }

  // --------- Carrusel: autoplay ----------
  resumeAutoplay() {
    if (this.timer) return;
    this.timer = setInterval(() => this.nextSlide(), this.intervalMs);
  }

  pauseAutoplay() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private restartAutoplay() {
    this.pauseAutoplay();
    this.resumeAutoplay();
  }

  // --------- Utilidades ----------
  addToCart(p: Product) { this.cartService.addToCart(p); }

  onCatImgError(e: Event) {
    (e.target as HTMLImageElement).src = '/assets/placeholders/category.webp';
  }

  trackById = (_: number, p: Product) => p.id;

  private http = inject(HttpClient);

  destacados = signal<Product[]>([]);         // ← NUEVO
  private readonly FEATURED_IDS = [10, 12, 13]; // ← NUEVO

  private async loadFeaturedByIds() {
    try {
      const calls = this.FEATURED_IDS.map(id =>
        firstValueFrom(this.http.get<any>(`/api/products/${id}`))
      );
      const raw = await Promise.all(calls);
      const items = raw.map(x => this.toProduct(x)); // usa tu mapper existente
      this.destacados.set(items);
      this.restartAutoplay(); // si usas autoplay del carrusel
    } catch (e) {
      console.error('Error cargando destacados fijos', e);
      this.destacados.set([]);
    }
  }
  

}
