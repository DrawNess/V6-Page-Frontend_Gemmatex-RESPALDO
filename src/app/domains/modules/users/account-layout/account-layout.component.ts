import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserSidebarComponent } from '../components/user-sidebar/user-sidebar.component';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [RouterOutlet, UserSidebarComponent],
  templateUrl: './account-layout.component.html',
})
export class AccountLayoutComponent {}
