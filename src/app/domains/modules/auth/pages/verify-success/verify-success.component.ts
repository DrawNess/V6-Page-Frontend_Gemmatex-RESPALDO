import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-verify-success',
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-success.component.html',
  styleUrl: './verify-success.component.css',
})
export class VerifySuccessComponent {
  readonly title = 'Correo verificado correctamente';
  readonly message =
    'Tu cuenta ya está activa. Inicia sesión para continuar con tu compra y ver tu historial.';
}
