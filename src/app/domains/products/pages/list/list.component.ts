// src/app/domains/pages/Home/home.component.ts  (o inicio.component.ts)
import { PromoService } from '@shared/services/promo.service';
import { Promo } from '@shared/models/promo.model';

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroSlideService } from '@shared/services/hero-slide.service';
import { HeroSlide } from '@shared/models/hero-slide.model';

import { AnnouncementService } from '@shared/services/announcement.service';
import { Announcement } from '@shared/models/announcement.model';

import { Product } from '@shared/models/product.model';
import { ProductService } from '@shared/services/product.service';
import { CartService, CartItem } from '@shared/services/cart.service';
import { ProductComponent } from '@products/components/product/product.component';


@Component({
    selector: 'app-list',
    imports: [CommonModule, RouterLink, ProductComponent],
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})

export default class ListComponent implements OnInit, OnDestroy {
  private static readonly RANDOM_PAGE_SIZE = 24;
  private static readonly RANDOM_PICK_COUNT = 10;
  private static readonly EXTERNAL_URL_RE = /^(https?:\/\/|mailto:|tel:)/i;

  private heroSrv = inject(HeroSlideService);

  slides  = signal<HeroSlide[]>([]);
  loading = signal<boolean>(true);
  error   = signal<string | null>(null);

  current = signal<number>(0);

  // autoplay más calmado
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 9000;
    /* ========== PROMOS (banners debajo del hero) ========== */
  private promoService = inject(PromoService);
  private promos = signal<Promo[]>([]);

  readonly promosLoading = signal(false);
  readonly promosError   = signal<string | null>(null);

  readonly activePromos = computed(() => {
    const now = new Date();
    return this.promos().filter(p => {
      if (!p.is_active) return false;
      const startOk = !p.startAt || new Date(p.startAt) <= now;
      const endOk   = !p.endAt   || new Date(p.endAt)   >= now;
      return startOk && endOk;
    }).sort((a, b) => {
      const ao = a.ordering ?? 9999;
      const bo = b.ordering ?? 9999;
      return ao - bo;
    });
  });

  readonly currentPromo = signal(0);


  /* NG ON INIT */
  ngOnInit() {
    // HERO SLIDES
    this.heroSrv.getAll({ activeNow: true }).subscribe({
      next: (items) => {
        const now = new Date();
        const inRange = (a?: string | null, b?: string | null) => {
          const sOk = !a || new Date(a) <= now;
          const eOk = !b || new Date(b) >= now;
          return sOk && eOk;
        };

        const data = (items ?? [])
          .filter(s => !!s.is_active && inRange(s.startAt, s.endAt))
          .sort((a,b)=> (a.ordering ?? 0) - (b.ordering ?? 0));

        this.slides.set(data);
        this.loading.set(false);
        this.start();
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudo cargar el hero.');
        this.loading.set(false);
      }
    });

    document.addEventListener('visibilitychange', this.onVis);

    /* Announcement */
    this.annService.getAll({ activeNow: true }).subscribe({
      next: (items) => {
        this.announcements.set(items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudieron cargar los anuncios.');
        this.loading.set(false);
      }
    });
    /* ============== */


    /* CARDS ALEATORIO */
    this.loadRandom10();
    // autoplay opcional:
    // this.resumeAutoplayRandom();
    /* =============== */

    // PROMOS
    this.loadPromos();
  }

  /* NG ON DESTROY */
  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.onVis);
    this.stop();

    /* CARDS ALEATORIO */
    this.pauseAutoplayRandom();
    /* =============== */
  }

  /** HERO AUTOPLAY Y NAVEGACION */
  private start() {
    this.stop();
    if (this.slides().length <= 1) return;
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }
  private stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  pause()  { this.stop(); }
  resume() { this.start(); }
  private onVis = () => { document.hidden ? this.stop() : this.start(); };

  /** navegación */
  prev() {
    const n = this.slides().length;
    if (!n) return;
    this.current.set((this.current() - 1 + n) % n);
  }
  next() {
    const n = this.slides().length;
    if (!n) return;
    this.current.set((this.current() + 1) % n);
  }
  go(i: number) {
    if (i < 0 || i >= this.slides().length) return;
    this.current.set(i);
  }

  /** helpers imagen/link */
  imgDesktop(s: HeroSlide) { return s.imageUrl; }
  imgMobile(s: HeroSlide)  { return s.mobileImageUrl }
  cta(s: HeroSlide)        { return (s.ctaUrl ?? '').trim() || null; } // SOLO ctaUrl, sin texto overlay
  heroRouterLink(s: HeroSlide) {
    const url = this.cta(s);
    if (!url) return null;
    return url.startsWith('/') ? url : null;
  }
  heroHref(s: HeroSlide): string | null {
    const url = this.cta(s);
    if (!url) return null;
    return ListComponent.EXTERNAL_URL_RE.test(url) ? url : null;
  }
  /* =========================================== */

  // ANNNOUNCEMENTS
  private annService = inject(AnnouncementService);

  // estado
  announcements = signal<Announcement[]>([]);


  /* VIGENCIA: activo y dentro de rango de fechas
   * @param startAt fecha inicio (ISO) o null
   * @param endAt fecha fin (ISO) o null
   * @return true si ahora está dentro del rango
  */
  private isNowActive(startAt?: string | null, endAt?: string | null): boolean {
    const now = new Date();
    const startOk = !startAt || new Date(startAt) <= now;
    const endOk   = !endAt   || new Date(endAt)   >= now;
    return startOk && endOk;
  }

  /* LISTA FINAL
   * Anuncios activos y ordenados
   * ORDENADOS POR ordering ASC
  */
  activeAnnouncements = computed(() =>
    (this.announcements() ?? [])
      .filter(a => !!a.is_active && this.isNowActive(a.startAt, a.endAt))
      .sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0))
  );

  // ANNOUNCEMENT HELPERS
  /** label visible dentro del chip */
  annLabel(a: Announcement) {
    return (a.linkLabel && a.linkLabel.trim()) || a.title || 'Anuncio';
  }
  /** destino del chip: usar linkUrl (interno) */
  annRouterLink(a: Announcement) {
    const url = (a.linkUrl || '').trim();
    if (!url) return null;
    const isExternal = ListComponent.EXTERNAL_URL_RE.test(url);
    return isExternal ? null : [url];
  }
  /** destino del chip: usar linkUrl (externo) */
  annHref(a: Announcement) {
    const url = (a.linkUrl || '').trim();
    if (!url) return null;
    const isExternal = ListComponent.EXTERNAL_URL_RE.test(url);
    return isExternal ? url : null;
  }
  /** trackBy estable */
  trackByAnn(_index: number, a: Announcement) {
    return a.id;
  }
  /* =========================================== */
  /* ------ CARDS ALEATORIOS (Random products) ------ */
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  // === estado ===
  random10 = signal<Product[]>([]);

  // === carrusel ===
  @ViewChild('randomTrack', { static: false }) randomTrack?: ElementRef<HTMLDivElement>;
  private randomTimer: ReturnType<typeof setInterval> | null = null;
  private readonly randomIntervalMs = 3800; // velocidad autoplay

  // === data ===
  private loadRandom10() {
    this.productService.listProducts({ page: 1, pageSize: ListComponent.RANDOM_PAGE_SIZE }).subscribe({
      next: (items) => {
        const list = (items?.data ?? []).slice();
        // Fisher–Yates + toma 10
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        this.random10.set(list.slice(0, ListComponent.RANDOM_PICK_COUNT));
      },
      error: () => this.random10.set([])
    });
  }

  // === acciones ===
  addToCart(p: Product) {
    const variant = p.variants?.find(v => v.is_active && v.stock > 0) ?? p.variants?.[0];
    if (!variant) return;
    const item: CartItem = {
      variantId: variant.id,
      productId: p.id,
      name: p.name,
      sku: variant.sku,
      price: Number(variant.price),
      discountPrice: variant.discountPrice != null ? Number(variant.discountPrice) : null,
      imageUrl: variant.imageUrl || p.imageUrl,
      colorName: variant.color?.name ?? null,
      colorHex: variant.color?.hex ?? null,
    };
    this.cartService.addToCart(item);
  }

  // === navegación carrusel ===
  private stepPx(): number {
    const el = this.randomTrack?.nativeElement;
    if (!el) return 0;
    const first = el.querySelector<HTMLElement>('.snap-start');
    if (!first) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap || '0');
    return first.clientWidth + gap;
  }

  nextRandom() {
    const el = this.randomTrack?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: this.stepPx(), behavior: 'smooth' });
    this.restartAutoplayRandom();
  }

  prevRandom() {
    const el = this.randomTrack?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: -this.stepPx(), behavior: 'smooth' });
    this.restartAutoplayRandom();
  }

  // === autoplay ===
  resumeAutoplayRandom() {
    if (this.randomTimer) return;
    this.randomTimer = setInterval(() => this.nextRandom(), this.randomIntervalMs);
  }

  pauseAutoplayRandom() {
    if (this.randomTimer) {
      clearInterval(this.randomTimer);
      this.randomTimer = null; }
  }

  private restartAutoplayRandom() {
    this.pauseAutoplayRandom();
    this.resumeAutoplayRandom();
  }

  /* ============================== */
  private loadPromos() {
    this.promosLoading.set(true);
    this.promosError.set(null);

    this.promoService.getAll({ activeNow: true }).subscribe({
      next: (items) => {
        this.promos.set(items ?? []);
        this.promosLoading.set(false);
        if (this.currentPromo() >= this.activePromos().length) {
          this.currentPromo.set(0);
        }
      },
      error: (err) => {
        console.error('Error cargando promos', err);
        this.promosError.set('No se pudieron cargar las promociones.');
        this.promosLoading.set(false);
      }
    });
  }

  nextPromo() {
    const n = this.activePromos().length;
    if (!n) return;
    this.currentPromo.set((this.currentPromo() + 1) % n);
  }

  prevPromo() {
    const n = this.activePromos().length;
    if (!n) return;
    this.currentPromo.set((this.currentPromo() - 1 + n) % n);
  }

  goPromo(i: number) {
    const n = this.activePromos().length;
    if (!n) return;
    if (i < 0 || i >= n) return;
    this.currentPromo.set(i);
  }

  private normalizeCtaUrl(url?: string | null): string | null {
    const value = (url ?? '').trim();
    if (!value) return null;
    if (value.startsWith('/')) return value;
    if (ListComponent.EXTERNAL_URL_RE.test(value)) return value;
    if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})(\/|$)/i.test(value)) return `https://${value}`;
    return null;
  }

  private promoProductFallback(p: Promo): string | null {
    if (!p.hrefProductId) return null;
    return `/product/${p.hrefProductId}`;
  }

  promoRouterLink(p: Promo) {
    const url = this.normalizeCtaUrl(p.ctaUrl);
    if (url?.startsWith('/')) {
      if (url === '/productos') return this.promoProductFallback(p) ?? url;
      return url;
    }
    if (!url) return this.promoProductFallback(p);
    return null;
  }

  promoHref(p: Promo): string | null {
    const url = this.normalizeCtaUrl(p.ctaUrl);
    if (!url || url.startsWith('/')) return null;
    return url;
  }
}
