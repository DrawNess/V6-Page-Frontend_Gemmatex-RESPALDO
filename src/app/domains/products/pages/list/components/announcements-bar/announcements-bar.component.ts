import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnnouncementService } from '@shared/services/announcement.service';
import { Announcement } from '@shared/models/announcement.model';
import { resolveLink } from '@core/utils/resolve-link.util';

@Component({
  selector: 'app-announcements-bar',
  imports: [NgStyle, NgTemplateOutlet, RouterLink],
  templateUrl: './announcements-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnouncementsBarComponent implements OnInit {
  private annService = inject(AnnouncementService);
  private announcements = signal<Announcement[]>([]);

  readonly active = computed(() => {
    const now = new Date();
    return this.announcements()
      .filter(a => !!a.is_active && this.inRange(a.startAt, a.endAt, now))
      .sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0));
  });

  ngOnInit() {
    this.annService.getAll({ activeNow: true }).subscribe({
      next: items => this.announcements.set(items ?? []),
      error: err  => console.error(err)
    });
  }

  private inRange(startAt?: string | null, endAt?: string | null, now = new Date()) {
    return (!startAt || new Date(startAt) <= now) && (!endAt || new Date(endAt) >= now);
  }

  label(a: Announcement)      { return (a.linkLabel?.trim()) || a.title || 'Anuncio'; }
  routerLink(a: Announcement) { return resolveLink(a.linkUrl).routerLink; }
  href(a: Announcement)       { return resolveLink(a.linkUrl).href; }
  trackBy(_i: number, a: Announcement) { return a.id; }

  chipStyle(a: Announcement) {
    return {
      background:   a.background  || '#EAF1FF',
      color:        a.textColor   || '#0B1A7A',
      borderColor:  '#cfe0ff'
    };
  }
}
