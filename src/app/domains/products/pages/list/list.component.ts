import { Component, Input, SimpleChanges, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLinkWithHref } from '@angular/router';
import { ProductComponent } from '@products/components/product/product.component';
import { HeaderComponent } from '@shared/components/header/header.component';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { ProductService } from '@shared/services/product.service';
import { CategoryService } from '@shared/services/category.service';
import { Category } from '@shared/models/category.model';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, ProductComponent, HeaderComponent, RouterLinkWithHref],
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

  ngOnInit() {
    this.getCategories();
  }

  ngOnChanges(_: SimpleChanges) {
    this.getProducts();
  }

  ngAfterViewInit() {
    // arranca auto-scroll cuando ya existe el track
    setTimeout(() => this.rouletteResume(), 0);
  }

  ngOnDestroy() {
    this.roulettePause();
  }

  addToCart(product: Product) {
    this.cartService.addToCart(product)
  }

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

  // trackBy (lo sigues usando en el grid)
  trackById = (_: number, p: Product) => p.id;
  onCatImgError(e: Event) {
    const el = e.target as HTMLImageElement;
    el.src = '/assets/placeholders/category.webp'; // tu placeholder
  }

  
}
