import {
  Component, Input, SimpleChanges, inject, signal,
  ElementRef, ViewChild, OnInit, OnDestroy, OnChanges
} from '@angular/core';
import { Router } from '@angular/router';
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
import { BestsellerComponent } from "./../../components/bestseller/bestseller.component";


@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductComponent, BestsellerComponent],
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
    brand: x.brand ?? x.brand ?? '',
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
    subcategory: x.subcategory
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
    this.startHero();
    this.resume();
  }

  ngOnChanges(_: SimpleChanges) {

    this.getProducts();
  }

  ngOnDestroy() {
    this.pauseAutoplay();
    this.pauseHero();
    this.pause()
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
  // === HERO SLIDER ===
  currentSlide = 0;
  private heroTimer: any = null;
  private heroIntervalMs = 6000; // cambia la velocidad aquí

  slides = [
    {
      id: 1,
      image: 'https://peru-crane-813567.hostingersite.com/Logos/Portada/Portada%20publi%20F6470.jpg',
      headline: '',
      subhead: '',
      routerLink: ['/product', 14], // 👉 id del producto en promo
    },
   
    {
      id: 2,
      image: 'https://peru-crane-813567.hostingersite.com/Logos/Portada/Portada%20publi%20Curso%20de%20serigrafia.jpg',
      headline: '',
      subhead: '.',
      routerLink: ['/product', 13],
    },
/*     {
      id: 3,
      image: 'https://peru-crane-813567.hostingersite.com/Logos/Portada/Portada%20publi%20papel%20sublimaci%C3%B3n.jpg',
      headline: '',
      subhead: '.',
      routerLink: '.',
    }, */
  ];


  startHero() {
    this.pauseHero();
    this.heroTimer = setInterval(() => this.nextHero(), this.heroIntervalMs);
  }

  pauseHero() {
    if (this.heroTimer) { clearInterval(this.heroTimer); this.heroTimer = null; }
  }

  resumeHero() {
    if (!this.heroTimer) this.startHero();
  }

  nextHero() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  prevHero() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
  }

  goHero(i: number) {
    this.currentSlide = i % this.slides.length;
    // reinicia el autoplay para que no cambie inmediatamente
    this.startHero();
  }








  
  // dentro de tu componente
current = 0;
private timer2: any = null;
private intervalMs2 = 4800;

// imágenes cuadradas (pon las tuyas)
  slides2 = [
    {
      id: 1,
      productId: 15,
      image: 'https://peru-crane-813567.hostingersite.com/Logos/Ofertas/Epson%20f6470.jpg',
      alt: 'Producto 11'
    },
    {
      id: 2,
      productId: 10,
      image: 'https://peru-crane-813567.hostingersite.com/Logos/Ofertas/Epson%20f170.jpg',
      alt: 'Producto 12'
    },
    {
      id: 3,
      productId: 13,
      image: 'https://peru-crane-813567.hostingersite.com/Logos/Ofertas/Epson%20f570.jpg',
      alt: 'Producto 13'
    },
  ];

  private router = inject(Router);
  // ===== Ciclo =====


  next()  { this.current = (this.current + 1) % this.slides2.length; }
  prev()  { this.current = (this.current - 1 + this.slides2.length) % this.slides2.length; }
  go(i: number) { this.current = (i + this.slides2.length) % this.slides2.length; this.restart(); }

  resume() { if (!this.timer2) this.timer2 = setInterval(() => this.next(), this.intervalMs2); }
  pause()  { if (this.timer2) { clearInterval(this.timer2); this.timer2 = null; } }
  private restart() { this.pause(); this.resume(); }

  // ===== Estilo/posiciones (centro + laterales Apple-like) =====
  isCenter(i: number) { return i === this.current; }
  isLeft(i: number)   { return (i - this.current + this.slides2.length) % this.slides2.length === this.slides2.length - 1; }
  isRight(i: number)  { return (i - this.current + this.slides2.length) % this.slides2.length === 1; }

  isClickable(i: number) { return this.isCenter(i) || this.isLeft(i) || this.isRight(i); }

  positionStyle(i: number): {[k: string]: any} {
    const base = { transform: '', opacity: 1, filter: '', zIndex: 10 };

    if (this.isCenter(i)) {
      return {
        ...base,
        transform: 'translateX(0) scale(1)',
        zIndex: 30,
        filter: 'none',
        opacity: 1
      };
    }

    if (this.isLeft(i)) {
      return {
        ...base,
        transform: 'translateX(-58%) scale(0.86)',

        filter: 'grayscale(30%)',
        opacity: 0.85
      };
    }

    if (this.isRight(i)) {
      return {
        ...base,
        transform: 'translateX(58%) scale(0.86)',
        zIndex: 20,
        filter: 'grayscale(30%)',
        opacity: 0.85
      };
    }

    // resto (fuera de escena)
    return {
      ...base,
      transform: 'translateX(0) scale(0.7)',
      opacity: 0,
      zIndex: 5,

    };
  }




  // ===== Swipe móvil =====
  private startX = 0;
  private swiping = false;

  onPointerDown(e: PointerEvent) {
    this.startX = e.clientX;
    this.swiping = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this.pause();
  }

  onPointerUp(e: PointerEvent) {
    if (!this.swiping) return;
    const dx = e.clientX - this.startX;
    this.swiping = false;

    const TH = 40; // umbral px
    if (dx > TH) this.prev();
    else if (dx < -TH) this.next();

    this.resume();
  }

  onPointerCancel() { this.swiping = false; this.resume(); }

// ===== Teclado + navegación segura =====
onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
  if (e.key === 'ArrowRight'){ e.preventDefault(); this.next(); }
  if (e.key === 'Enter')     { this.navigateCenter(this.current); }
}

/** Navega al producto del slide central de forma programática (por si algún overlay interfiere) */
navigateCenter(i: number) {
  if (!this.isCenter(i)) { this.go(i); return; }
  const pid = this.slides2[i]?.productId;
  if (pid != null) this.router.navigate(['/product', pid]);
}


}


