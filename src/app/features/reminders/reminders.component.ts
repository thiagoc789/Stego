import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Couple, Reminder } from '../../core/models/couple.model';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule],
  template: `
    <div class="reminders-page">
      <div class="add-card">
        <p class="add-title">Nuevo recordatorio</p>
        <input class="text-input" [(ngModel)]="newTitle" placeholder="Aniversario, cita, evento..." />
        <input class="text-input datetime" type="datetime-local" [(ngModel)]="newDatetime" />
        <button class="add-btn" (click)="addReminder()" [disabled]="!newTitle.trim() || !newDatetime">
          <mat-icon>add_alarm</mat-icon> Agregar
        </button>
      </div>

      <div class="reminders-list">
        @for (r of reminders(); track r.id) {
          <div class="reminder-item" [class.done]="r.done">
            <button class="check-btn" [class.checked]="r.done" (click)="toggle(r)">
              @if (r.done) { ✓ } @else { &nbsp; }
            </button>
            <div class="reminder-info" (click)="toggle(r)">
              <span class="reminder-title">{{ r.title }}</span>
              <span class="reminder-meta">
                {{ r.datetime | date:'d MMM yyyy · HH:mm' }}
                <span class="reminder-by">· {{ creatorName(r) }}</span>
              </span>
            </div>
            <button class="del-btn" (click)="deleteReminder(r)">×</button>
          </div>
        } @empty {
          <div class="empty-state">
            <span>🗓️</span>
            <p>Sin recordatorios</p>
            <span class="empty-sub">¡Agrega fechas importantes!</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .reminders-page { padding: 1.2rem; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.2rem; }

    .add-card {
      background: white; border-radius: 18px; padding: 1.2rem;
      box-shadow: 0 4px 20px rgba(194,24,91,0.1); border: 1.5px solid #fce4ec;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .add-title { margin: 0; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #e91e63; }
    .text-input {
      width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #f0d0dc;
      border-radius: 12px; font-size: 0.9rem; font-family: inherit; outline: none;
      background: #fffbfc; box-sizing: border-box; transition: border-color 0.2s;
      &:focus { border-color: #e91e63; }
      &.datetime { color: #555; }
    }
    .add-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 0.75rem; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; font-size: 0.9rem; font-weight: 600; cursor: pointer;
      box-shadow: 0 3px 12px rgba(233,30,99,0.3); transition: all 0.2s ease;
      mat-icon { font-size: 1.1rem; height: 1.1rem; width: 1.1rem; }
      &:disabled { background: #eee; color: #bbb; box-shadow: none; cursor: default; }
      &:not(:disabled):hover { transform: translateY(-1px); }
    }

    .reminders-list { display: flex; flex-direction: column; gap: 0.7rem; }
    .reminder-item {
      display: flex; align-items: center; gap: 0.9rem;
      background: white; border-radius: 14px; padding: 0.9rem 1rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06); transition: all 0.2s ease;
      &.done { opacity: 0.5; .reminder-title { text-decoration: line-through; } }
    }
    .check-btn {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid #f48fb1; background: transparent;
      color: white; font-size: 0.8rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.2s ease;
      &.checked { background: linear-gradient(135deg, #e91e63, #9c27b0); border-color: transparent; }
    }
    .reminder-info { flex: 1; display: flex; flex-direction: column; gap: 2px; cursor: pointer; }
    .reminder-title { font-size: 0.95rem; font-weight: 500; color: #333; }
    .reminder-meta { font-size: 0.75rem; color: #aaa; }
    .reminder-by { color: #e91e63; font-weight: 600; }
    .del-btn {
      width: 28px; height: 28px; border-radius: 50%; border: none;
      background: transparent; color: #ddd; font-size: 1.2rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.15s ease;
      &:hover { background: #fce4ec; color: #e91e63; }
    }

    .empty-state {
      text-align: center; padding: 3rem 1rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem; font-size: 2.5rem;
    }
    .empty-state p { margin: 0; font-size: 1rem; font-weight: 500; color: #aaa; }
    .empty-sub { font-size: 0.85rem; color: #ccc; }
  `],
})
export class RemindersComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService  = inject(AuthService);
  private destroyRef   = inject(DestroyRef);

  reminders = signal<Reminder[]>([]);
  couple    = signal<Couple | null>(null);
  newTitle    = '';
  newDatetime = '';
  private coupleId = '';
  private myUid    = '';

  ngOnInit() {
    this.authService.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      switchMap(user => {
        this.coupleId = user!.coupleId!;
        this.myUid    = user!.uid;
        return this.coupleService.getCouple$(this.coupleId).pipe(take(1));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(couple => {
      this.couple.set(couple);
      this.coupleService.getReminders$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(r => this.reminders.set(r));
    });
  }

  creatorName(r: Reminder) {
    const c = this.couple();
    if (!c) return '';
    return r.createdByUid === this.myUid ? 'Vos' : this.coupleService.getDisplayName(r.createdByUid, c);
  }

  async addReminder() {
    if (!this.newTitle.trim() || !this.newDatetime || !this.coupleId) return;
    await this.coupleService.addReminder(this.coupleId, this.newTitle.trim(), new Date(this.newDatetime));
    this.newTitle = '';
    this.newDatetime = '';
  }

  async toggle(r: Reminder) { await this.coupleService.toggleReminder(this.coupleId, r.id, !r.done); }
  async deleteReminder(r: Reminder) { await this.coupleService.deleteReminder(this.coupleId, r.id); }
}
