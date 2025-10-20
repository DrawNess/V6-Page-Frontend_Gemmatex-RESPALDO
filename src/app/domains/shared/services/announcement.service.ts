import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Announcement } from '@shared/models/announcement.model';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {

  constructor() { }
  private http = inject(HttpClient);
  private base = 'http://localhost:3000/api/v1';

  getAll() {
    return this.http.get<Announcement[]>(`${this.base}/announcements`);
  }
}
