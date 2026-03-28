import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  /** Desktop: sidebar colapsado (solo iconos) */
  readonly collapsed = signal(false);

  /** Movil: sidebar abierto como overlay */
  readonly mobileOpen = signal(false);

  toggleCollapse() { this.collapsed.update(v => !v); }
  toggleMobile()   { this.mobileOpen.update(v => !v); }
  closeMobile()    { this.mobileOpen.set(false); }
}
