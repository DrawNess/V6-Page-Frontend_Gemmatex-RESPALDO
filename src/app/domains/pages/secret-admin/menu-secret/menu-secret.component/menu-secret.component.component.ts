import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

@Component({
    selector: 'app-menu-secret.component',
    imports: [CommonModule, RouterLink],
    templateUrl: './menu-secret.component.component.html',
    styleUrl: './menu-secret.component.component.css'
})
export class MenuSecretComponentComponent {
  base = `/${ROUTE_CONSTANTS.SECRET_BASE}`;
}
