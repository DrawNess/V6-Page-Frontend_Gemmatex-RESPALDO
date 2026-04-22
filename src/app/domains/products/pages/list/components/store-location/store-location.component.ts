import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-store-location',
  imports: [RouterLink],
  templateUrl: './store-location.component.html',
  styleUrl: './store-location.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreLocationComponent {}
