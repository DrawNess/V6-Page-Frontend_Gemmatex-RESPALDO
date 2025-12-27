import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-promo-bar',
  imports: [CommonModule],
  templateUrl: './promo-bar.component.html',
  styleUrl: './promo-bar.component.css',
})
export class PromoBarComponent implements OnInit, OnDestroy {

  mensaje = 'NO SOLO TE VENDEMOS EL PRODUCTO, TE ENSEÑAMOS A UTILIZARLO.';
  chars: string[] = Array.from(this.mensaje);
  animate = false;
  private loopTimer: any;

  ngOnInit() {
    setTimeout(() => (this.animate = true), 50);

    this.loopTimer = setInterval(() => {
      this.animate = false;
      setTimeout(() => (this.animate = true), 60);
    }, 9000);
  }

  ngOnDestroy() {
    if (this.loopTimer) clearInterval(this.loopTimer);
  }
}
