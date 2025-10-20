// src/app/domains/pages/home/list/list.component.ts
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AnnouncementService } from '@shared/services/announcement.service';
import { HeroSlideService } from '@shared/services/hero-slide.service';
import { PromoService } from '@shared/services/promo.service';

import { Announcement } from '@shared/models/announcement.model';
import { HeroSlide } from '@shared/models/hero-slide.model';
import { Promo } from '@shared/models/promo.model';


@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})

export default class ListComponent implements OnInit, OnDestroy {

  private annService = inject(AnnouncementService);
  private heroService = inject(HeroSlideService);
  private promoService = inject(PromoService);

  // data
  announcements = signal<Announcement[]>([]);
  heroSlides   = signal<HeroSlide[]>([]);
  promos       = signal<Promo[]>([]);

  // estado
  loading = signal(true);
  error = signal<string | null>(null);

  // hero player
  current = signal(0);
  private heroTimer: any = null;
  private readonly heroInterval = 6000;

  // ======= helpers de tiempo (activos ahora) =======
  private isNowActive = (startAt?: string | null, endAt?: string | null): boolean => {
    const now = new Date();
    const startOk = !startAt ? true : (new Date(startAt) <= now);
    const endOk   = !endAt ? true : (new Date(endAt) >= now);
    return startOk && endOk;
  };

  // derivados filtrados / ordenados
  activeAnnouncements = computed(() =>
    (this.announcements() || [])
      .filter(a => a.is_active && this.isNowActive(a.startAt, a.endAt))
      .sort((x,y) => (x.ordering ?? 0) - (y.ordering ?? 0))
  );

  activeSlides = computed(() =>
    (this.heroSlides() || [])
      .filter(s => s.is_active && this.isNowActive(s.startAt, s.endAt))
      .sort((x,y) => (x.ordering ?? 0) - (y.ordering ?? 0))
  );

  activePromos = computed(() =>
    (this.promos() || [])
      .filter(p => p.is_active/*  && this.isNowActive(p.startAt, p.endAt) */)
      .sort((x,y) => (x.ordering ?? 0) - (y.ordering ?? 0))
  );

  // imagen responsive para hero
  heroImage = (s: HeroSlide) => s?.imageUrl;
  heroImageMobile = (s: HeroSlide) => s?.mobileImageUrl || s?.imageUrl;

  // ====== ciclo de vida ======
  ngOnInit() {
    Promise.all([
      this.annService.getAll().toPromise(),
      this.heroService.getAll().toPromise(),
      this.promoService.getAll().toPromise(),
    ])
    .then(([anns, slides, promos]) => {
      this.announcements.set(anns ?? []);
      this.heroSlides.set(slides ?? []);
      this.promos.set(promos ?? []);
      this.loading.set(false);
      this.startHero();
    })
    .catch(err => {
      console.error(err);
      this.error.set('No se pudo cargar el contenido inicial.');
      this.loading.set(false);
    });
  }

  ngOnDestroy() { this.stopHero(); }

  // ====== hero controls ======
  startHero() {
    this.stopHero();
    if ((this.activeSlides()?.length ?? 0) <= 1) return;
    this.heroTimer = setInterval(() => this.next(), this.heroInterval);
  }
  stopHero() { if (this.heroTimer) { clearInterval(this.heroTimer); this.heroTimer = null; } }
  pauseHero() { this.stopHero(); }
  resumeHero() { this.startHero(); }

  prev() {
    const n = this.activeSlides().length;
    if (n === 0) return;
    const i = this.current();
    this.current.set( (i - 1 + n) % n );
  }
  next() {
    const n = this.activeSlides().length;
    if (n === 0) return;
    const i = this.current();
    this.current.set( (i + 1) % n );
  }
  go(i: number) {
    if (i >= 0 && i < this.activeSlides().length) this.current.set(i);
  }

  // CTA de hero: o va a producto (router) o a link externo
  slideRouterLink(s: HeroSlide) {
    return s.hrefProductId ? ['/product', s.hrefProductId] : null;
  }
  slideHref(s: HeroSlide) {
    return !s.hrefProductId && s.ctaUrl ? s.ctaUrl : null;
  }

  // CTA de anuncio
  annHref(a: Announcement) { return a.linkUrl || null; }
  annRouterLink(a: Announcement) {
    return a.hrefProductId ? ['/product', a.hrefProductId] : null;
  }

  // CTA promo
  promoHref(p: Promo) { return p.ctaUrl || null; }
  promoRouterLink(p: Promo) { return p.hrefProductId ? ['/product', p.hrefProductId] : null; }


  /* ---------------------------------------------- */
  
}


