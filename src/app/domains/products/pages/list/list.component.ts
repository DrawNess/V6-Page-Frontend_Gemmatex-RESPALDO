import { Component, Input, SimpleChanges, inject, signal, ElementRef, ViewChild, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkWithHref } from '@angular/router';
import { ProductComponent } from '@products/components/product/product.component';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { Category } from '@shared/models/category.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, ProductComponent, RouterLinkWithHref, RouterLink],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export default class ListComponent {

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);

  @Input() category_id?: string;

  // Hero
  heroUrl = 'https://iili.io/Fy4LpkP.jpg';
  heroAlt = 'Fondo de impresión y sublimación';

  // ===== Ruleta =====
  @ViewChild('rouletteTrack', { static: false }) rouletteTrack?: ElementRef<HTMLDivElement>;
  private rouletteTimer: any = null;
  private rouletteIntervalMs = 2200;

/*   ngOnInit() {
    this.getCategories();
  } */

  ngOnChanges(_: SimpleChanges) {
    this.getProducts();
  }

  ngAfterViewInit() {
    // arranca auto-scroll cuando ya existe el track
    setTimeout(() => this.rouletteResume(), 0);
  }


/*   addToCart(product: Product) {
    this.cartService.addToCart(product)
  } */

  private getProducts() {
    this.productService.getProducts(this.category_id)
      .subscribe({
        next: (products) => this.products.set(products),
        error: () => {}
      });
  }

  private getCategories() {
    this.categoryService.getAll()
      .subscribe({
        next: (data) => this.categories.set(data),
        error: () => {}
      });
  }

  // ===== Lógica de ruleta =====
  private step() {
    const el = this.rouletteTrack?.nativeElement;
    if (!el) return 240;
    return Math.max(160, Math.floor(el.clientWidth / 2));
  }

  private tick = () => {
    const el = this.rouletteTrack?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 1;
    const next = el.scrollLeft + this.step();
    if (next >= max) {
      el.scrollTo({ left: 0, behavior: 'auto' });
    } else {
      el.scrollBy({ left: this.step(), behavior: 'smooth' });
    }
  };

  roulettePause() {
    if (this.rouletteTimer) { clearInterval(this.rouletteTimer); this.rouletteTimer = null; }
  }
  rouletteResume() {
    this.roulettePause();
    this.rouletteTimer = setInterval(this.tick, this.rouletteIntervalMs);
  }
  scrollLeft() {
    this.roulettePause();
    this.rouletteTrack?.nativeElement.scrollBy({ left: -this.step(), behavior: 'smooth' });
  }
  scrollRight() {
    this.roulettePause();
    this.rouletteTrack?.nativeElement.scrollBy({ left:  this.step(), behavior: 'smooth' });
  }
  trackById = (_: number, p: Product) => p.id;
  onCatImgError(e: Event) {
    const el = e.target as HTMLImageElement;
    el.src = '/assets/placeholders/category.webp';
  }


  /* ===================================0 */

/*   private productService = inject(ProductService);
  private cartService = inject(CartService); */

  @ViewChild('carouselTrack', { static: false }) track?: ElementRef<HTMLDivElement>;

  all = signal<Product[]>([]);
  randomProducts = signal<Product[]>([]);

  // ======= Carga & random =======
  ngOnInit() {
    this.load();
    this.getCategories();
  }

  ngOnDestroy() {
    this.pauseAutoplay();
  }

  private load() {
    // trae un pool (p.ej. 24) y elige aleatorios
    this.productService.getProducts(/* puedes pasar filtros si quieres */).subscribe({
      next: (products) => {
        this.all.set(products ?? []);
        this.pickRandom(12); // mostramos 12 para que haya material para scrollear; visibles 1/2/3
        this.resumeAutoplay();
      },
      error: () => {
        this.all.set([]);
        this.randomProducts.set([]);
      }
    });
  }

  private pickRandom(n: number) {
    const pool = [...this.all()];
    // Fisher–Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.randomProducts.set(pool.slice(0, Math.min(n, pool.length)));
  }

  // ======= Navegación =======
  private stepPx(): number {
    const el = this.track?.nativeElement;
    if (!el) return 0;
    const first = el.querySelector<HTMLElement>('.slide');
    if (!first) return 0;
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.columnGap || '0');
    return first.clientWidth + gap; // avanzar 1 tarjeta (según breakpoint)
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

  // ======= Auto-play (opcional) =======
  private timer: any = null;
  private intervalMs = 3500;

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

  // passthrough
  addToCart(p: Product) { this.cartService.addToCart(p); }
}
