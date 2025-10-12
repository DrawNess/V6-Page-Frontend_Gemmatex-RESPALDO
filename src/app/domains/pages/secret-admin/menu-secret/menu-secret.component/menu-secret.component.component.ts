import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SECRET_BASE } from './../../../../../app.routes';

@Component({
  selector: 'app-menu-secret.component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu-secret.component.component.html',
  styleUrl: './menu-secret.component.component.css'
})
export class MenuSecretComponentComponent {
  base = `/${SECRET_BASE}`;
}
