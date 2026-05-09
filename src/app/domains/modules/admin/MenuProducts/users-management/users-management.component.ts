import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.css',
})
export class UsersManagementComponent {
  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;
  readonly menuUrl = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.MENU}`;
  readonly usersBase = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.USERS}`;
}
