import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiBranch } from '@shared/models/user-portal.model';
import { catchError, of, tap } from 'rxjs';

type BranchMap = Record<number, ApiBranch>;

@Injectable({ providedIn: 'root' })
export class BranchCacheService {
  private readonly key = 'app_branches_cache_v1';
  private readonly apiUrl = environment.API_URL;

  constructor(private readonly http: HttpClient) {}

  load(): void {
    this.http.get<ApiBranch[]>(`${this.apiUrl}/branches`).pipe(
      catchError(() => of([] as ApiBranch[])),
      tap(branches => this.persist(branches))
    ).subscribe();
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }

  getById(id: number | null | undefined): ApiBranch | null {
    if (!id) return null;
    const map = this.readMap();
    return map[id] ?? null;
  }

  getCityById(id: number | null | undefined): string {
    return this.getById(id)?.city ?? '—';
  }

  getAll(): ApiBranch[] {
    return Object.values(this.readMap());
  }

  resolveBranchIds(ids: number[]): ApiBranch[] {
    const map = this.readMap();
    return ids.map(id => map[id]).filter((b): b is ApiBranch => !!b);
  }

  private persist(branches: ApiBranch[]): void {
    const map: BranchMap = {};
    for (const b of branches) map[b.id] = b;
    localStorage.setItem(this.key, JSON.stringify(map));
  }

  private readMap(): BranchMap {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
