import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroSlideService } from '@shared/services/hero-slide.service';
import { HeroSlide } from '@shared/models/hero-slide.model';
import { resolveLink } from '@core/utils/resolve-link.util';

@Component({
  selector: 'app-hero-carousel',
  imports: [NgClass, NgTemplateOutlet, RouterLink],
  templateUrl: './hero-carousel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroCarouselComponent implements OnInit, OnDestroy {
  private heroSrv = inject(HeroSlideService);

  slides  = signal<HeroSlide[]>([]);
  loading = signal(true);
  error   = signal<string | null>(null);
  current = signal(0);

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 9000;
  private readonly onVis = () => { document.hidden ? this.stop() : this.start(); };

  ngOnInit() {
    this.heroSrv.getAll({ activeNow: true }).subscribe({
      next: (items) => {
        const now = new Date();
        const data = (items ?? [])
          .filter(s => !!s.is_active && this.inRange(s.startAt, s.endAt, now))
          .sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0));
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
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.onVis);
    this.stop();
  }

  private inRange(startAt?: string | null, endAt?: string | null, now = new Date()) {
    return (!startAt || new Date(startAt) <= now) && (!endAt || new Date(endAt) >= now);
  }

  private start() {
    this.stop();
    if (this.slides().length <= 1) return;
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }
  private stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  pause()  { this.stop(); }
  resume() { this.start(); }

  prev() { const n = this.slides().length; if (n) this.current.set((this.current() - 1 + n) % n); }
  next() { const n = this.slides().length; if (n) this.current.set((this.current() + 1) % n); }
  go(i: number) { if (i >= 0 && i < this.slides().length) this.current.set(i); }

  slideRouterLink(s: HeroSlide) { return resolveLink(s.ctaUrl).routerLink; }
  slideHref(s: HeroSlide)       { return resolveLink(s.ctaUrl).href; }
}
