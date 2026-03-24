import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { Color } from '@shared/models/color.model';

@Injectable({ providedIn: 'root' })
export class ColorService {
  private http = inject(HttpClient);
  private readonly base = environment.API_URL;

  getColors(): Observable<Color[]> {
    return this.http.get<Color[]>(`${this.base}/colors`).pipe(
      catchError(() => of([]))
    );
  }
}
