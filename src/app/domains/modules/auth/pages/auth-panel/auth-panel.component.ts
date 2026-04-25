import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoginComponent } from '../login/login.component';
import { RegisterComponent } from '../register/register.component';

@Component({
  selector: 'app-auth-panel',
  imports: [LoginComponent, RegisterComponent],
  templateUrl: './auth-panel.component.html',
  styleUrl: './auth-panel.component.css',
})
export class AuthPanelComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly isRegister = signal(false);

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private title: Title,
    private meta: Meta
  ) {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => this.setMode(data['mode'] === 'register'));
  }

  showRegister() {
    if (!this.isRegister()) {
      this.setMode(true);
      this.location.go('/auth/register');
    }
  }

  showLogin() {
    if (this.isRegister()) {
      this.setMode(false);
      this.location.go('/auth/login');
    }
  }

  private setMode(isRegister: boolean) {
    this.isRegister.set(isRegister);

    if (isRegister) {
      this.title.setTitle('Crear cuenta | Gemmatex');
      this.meta.updateTag({
        name: 'description',
        content: 'Crea tu cuenta en Gemmatex para comprar, gestionar pedidos y recibir soporte postventa.',
      });
      return;
    }

    this.title.setTitle('Iniciar sesión | Gemmatex');
    this.meta.updateTag({
      name: 'description',
      content: 'Inicia sesión en Gemmatex para gestionar pedidos, historial y soporte postventa.',
    });
  }
}
