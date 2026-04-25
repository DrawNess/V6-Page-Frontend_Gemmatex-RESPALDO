import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-brands-marquee',
  templateUrl: './brands-marquee.component.html',
  styleUrl: './brands-marquee.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandsMarqueeComponent {
  paused = false;

  readonly BASE_CLS = 'w-auto object-contain opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 shrink-0 select-none';
  imgCls(b: { h?: string }) { return `${b.h ?? 'h-9 sm:h-10'} ${this.BASE_CLS}`; }

  readonly brands: { name: string; src: string; h?: string }[] = [
    { name: 'Epson',      src: 'assets/img/brands/epson.png' },
    { name: 'Freesub',    src: 'assets/img/brands/freesub.webp' },
    { name: 'Quitexa',    src: 'assets/img/brands/quitexa.png' },
    { name: 'Sublinova',  src: 'assets/img/brands/sublinova.png', h: 'h-14 sm:h-16' },
    { name: 'Genesis',    src: 'assets/img/brands/genesis.svg' },
    { name: 'Hagabe',     src: 'assets/img/brands/hagabe.jpg', h: 'h-12 sm:h-20' },
    { name: 'Coldenhove', src: 'assets/img/brands/coldenhove.png' },
  ];
}
