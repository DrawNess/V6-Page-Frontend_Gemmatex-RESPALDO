import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SocialLink {
  name: string;
  url: string;
  icon: string;
  ariaLabel: string;
}

@Component({
  selector: 'app-promo-bar',
  imports: [CommonModule],
  templateUrl: './promo-bar.component.html',
  styleUrl: './promo-bar.component.css',
})
export class PromoBarComponent implements OnInit, OnDestroy {

  mensaje = 'NO SOLO TE VENDEMOS EL PRODUCTO, TE ENSEÑAMOS A UTILIZARLO.';
  chars: string[] = Array.from(this.mensaje);

  // Palabras agrupadas para no cortar mid-word en mobile
  readonly wordGroups: { chars: string[]; delays: number[]; isLast: boolean }[] = (() => {
    let idx = 0;
    return this.mensaje.split(' ').map((word, i, arr) => {
      const group = {
        chars: Array.from(word),
        delays: Array.from(word).map((_, ci) => idx + ci),
        isLast: i === arr.length - 1
      };
      idx += word.length + 1;
      return group;
    });
  })();

  animate = false;
  private loopTimer: any;

  socialLinks: SocialLink[] = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/profile.php?id=100076372653530',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/Facebook%20blanco.png',
      ariaLabel: 'Síguenos en Facebook'
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@gemmatextv',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/tiktok%20blanco.png',
      ariaLabel: 'Síguenos en TikTok'
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@GemmatexTV',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/Youtube%20blanco.png',
      ariaLabel: 'Suscríbete en YouTube'
    },
    {
      name: 'Messenger',
      url: 'https://www.facebook.com/profile.php?id=100076372653530',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/messager%20blanco.png',
      ariaLabel: 'Chatea por Messenger'
    }
  ];

  ngOnInit() {
    setTimeout(() => (this.animate = true), 30);

    this.loopTimer = setInterval(() => {
      this.animate = false;
      setTimeout(() => (this.animate = true), 30);
    }, 9000);
  }

  ngOnDestroy() {
    if (this.loopTimer) clearInterval(this.loopTimer);
  }

}
