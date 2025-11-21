import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Announcement } from '@shared/models/announcement.model';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {

  constructor() { }
  private http = inject(HttpClient);
  private base = 'https://gemmatex.store/api/v1/announcements';

  // GET /announcements
  getAll(params?: { activeNow?: boolean }) {
    const query = params?.activeNow ? '?activeNow=true' : '';
    return this.http.get<Announcement[]>(`${this.base}${query}`);
  }
  // GET /announcements/:id
  getOne(id: number | string) {
    return this.http.get<Announcement>(`${this.base}/${id}`);
  }

  // POST /announcements
  create(payload: Partial<Announcement>) {
    return this.http.post<Announcement>(this.base, payload);
  }
  // PATCH /announcements/:id
  update(id: number | string, payload: Partial<Announcement>) {
    return this.http.patch<Announcement>(`${this.base}/${id}`, payload);
  }

  // DELETE /announcements/:id
  delete(id: number | string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
