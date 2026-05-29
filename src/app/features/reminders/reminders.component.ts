import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Couple, Reminder } from '../../core/models/couple.model';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="page">

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card short"></div>
      }

      <!-- Progress header -->
      @if (!loading() && reminders().length > 0) {
        <div class="progress-card">
          <div class="progress-texts">
            <span class="progress-label">Tareas</span>
            <span class="progress-count">
              <strong>{{ doneCount() }}</strong> de {{ reminders().length }} completadas
            </span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" [style.width.%]="progressPct()"></div>
          </div>
          @if (doneCount() === reminders().length) {
            <p class="all-done">🎉 ¡Todo listo!</p>
          }
        </div>
      }

      <!-- Pending tasks -->
      @if (!loading()) {
      <div class="section">
        @for (r of pending(); track r.id) {
          <div class="task-row">
            <button class="checkbox" (click)="toggle(r)"></button>
            <div class="task-info">
              <span class="task-title">{{ r.title }}</span>
              <span class="task-meta">
                <span class="task-author" [class.mine]="r.createdByUid === myUid">
                  {{ creatorName(r) }}
                </span>
              </span>
            </div>
            <button class="del-btn" (click)="deleteReminder(r)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }

        @if (!loading() && pending().length === 0 && done().length === 0) {
          <div class="empty-state">
            <mat-icon>checklist</mat-icon>
            <p>Sin tareas pendientes</p>
            <span>¡Agreguen cosas por hacer juntos!</span>
          </div>
        }
      </div>

      } <!-- end !loading() pending section -->

      <!-- Completed tasks -->
      @if (!loading() && done().length > 0) {
        <div class="section">
          <div class="section-header">
            <span>Completadas · {{ done().length }}</span>
            <button class="clear-btn" (click)="clearDone()">Limpiar</button>
          </div>
          @for (r of done(); track r.id) {
            <div class="task-row done">
              <button class="checkbox checked" (click)="toggle(r)">
                <mat-icon>check</mat-icon>
              </button>
              <div class="task-info">
                <span class="task-title">{{ r.title }}</span>
                <span class="task-meta">
                  <span class="task-author" [class.mine]="r.createdByUid === myUid">
                    {{ creatorName(r) }}
                  </span>
                </span>
              </div>
              <button class="del-btn" (click)="deleteReminder(r)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
        </div>
      }

      <!-- Add task bar inside page flow so iOS keyboard positions correctly -->
      <div class="add-bar">
        <input
          class="add-input"
          [(ngModel)]="newTitle"
          placeholder="Nueva tarea..."
          (keydown.enter)="addReminder()"
        />
        <button class="add-btn" (click)="addReminder()" [disabled]="!newTitle.trim()">
          <mat-icon>add</mat-icon>
        </button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .page {
      padding: 1rem;
      max-width: 480px;
      margin: 0 auto;
      padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* ── Skeleton ── */
    .skeleton-card {
      height: 72px; border-radius: 18px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      &.short { height: 48px; }
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Progress ── */
    .progress-card {
      background: white;
      border-radius: 18px;
      padding: 1.1rem 1.2rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .progress-texts {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .progress-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #e91e63;
    }
    .progress-count {
      font-size: 0.82rem;
      color: #999;
      strong { color: #333; }
    }
    .progress-bar-track {
      height: 7px;
      background: #f0f0f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 10px;
      background: linear-gradient(90deg, #e91e63, #9c27b0);
      transition: width 0.4s ease;
    }
    .all-done {
      margin: 0;
      text-align: center;
      font-size: 0.85rem;
      font-weight: 600;
      color: #4caf50;
    }

    /* ── Sections ── */
    .section {
      background: white;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 3px 14px rgba(0,0,0,0.06);
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.7rem 1rem 0.4rem;
      border-bottom: 1px solid #f5f5f5;
      font-size: 0.75rem;
      font-weight: 600;
      color: #bbb;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .clear-btn {
      border: none;
      background: transparent;
      color: #e91e63;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      &:hover { background: #fce4ec; }
    }

    /* ── Task row ── */
    .task-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #fafafa;
      transition: background 0.15s;
      &:last-child { border-bottom: none; }
      &:hover { background: #fafafa; }
      &.done { opacity: 0.55; }
    }
    .checkbox {
      width: 24px; height: 24px;
      border-radius: 50%;
      border: 2px solid #f48fb1;
      background: transparent;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s ease;
      &:hover { border-color: #e91e63; background: #fce4ec; }
    }
    .checkbox.checked {
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      border-color: transparent;
      color: white;
      mat-icon { font-size: 0.9rem; height: 0.9rem; width: 0.9rem; }
    }
    .task-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .task-title {
      font-size: 0.92rem;
      font-weight: 500;
      color: #222;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      .done & { text-decoration: line-through; color: #aaa; }
    }
    .task-meta {
      font-size: 0.7rem;
    }
    .task-author {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #9c27b0;
      &.mine { color: #e91e63; }
    }
    .del-btn {
      width: 28px; height: 28px;
      border-radius: 50%; border: none;
      background: transparent; color: #ddd;
      cursor: pointer; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s ease;
      mat-icon { font-size: 1rem; height: 1rem; width: 1rem; }
      &:hover { background: #fce4ec; color: #e91e63; }
    }

    /* ── Empty ── */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      mat-icon { font-size: 2.5rem; height: 2.5rem; width: 2.5rem; color: #e0b0c8; }
      p { margin: 0; font-size: 0.95rem; font-weight: 500; color: #bbb; }
      span { font-size: 0.8rem; color: #ccc; }
    }

    /* ── Add bar ── */
    .add-bar {
      background: white;
      border-radius: 18px;
      border: 1.5px solid #f0d0dc;
      padding: 0.5rem 0.75rem 0.5rem 1rem;
      display: flex;
      gap: 0.6rem;
      align-items: center;
      box-shadow: 0 3px 14px rgba(233,30,99,0.1);
    }
    .add-input {
      flex: 1;
      border: 1.5px solid #f0d0dc;
      border-radius: 24px;
      padding: 0.6rem 1rem;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      background: #fffbfc;
      transition: border-color 0.2s;
      &:focus { border-color: #e91e63; }
      &::placeholder { color: #ccc; }
    }
    .add-btn {
      width: 40px; height: 40px;
      border-radius: 50%; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(233,30,99,0.35);
      flex-shrink: 0;
      transition: transform 0.15s;
      mat-icon { font-size: 1.3rem; height: 1.3rem; width: 1.3rem; }
      &:disabled { background: #eee; box-shadow: none; cursor: default; }
      &:not(:disabled):hover { transform: scale(1.08); }
    }
  `],
})
export class RemindersComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService  = inject(AuthService);
  private destroyRef   = inject(DestroyRef);

  reminders = signal<Reminder[]>([]);
  couple    = signal<Couple | null>(null);
  loading   = signal(true);
  newTitle  = '';
  myUid     = '';
  private coupleId = '';

  pending = computed(() =>
    this.reminders().filter(r => !r.done)
      .sort((a, b) => (b.createdAt as any)?.seconds - (a.createdAt as any)?.seconds)
  );

  done = computed(() =>
    this.reminders().filter(r => r.done)
      .sort((a, b) => (b.createdAt as any)?.seconds - (a.createdAt as any)?.seconds)
  );

  doneCount   = computed(() => this.done().length);
  progressPct = computed(() =>
    this.reminders().length === 0 ? 0 : Math.round((this.doneCount() / this.reminders().length) * 100)
  );

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
        .subscribe(r => { this.reminders.set(r); this.loading.set(false); });
    });
  }

  creatorName(r: Reminder) {
    const c = this.couple();
    if (!c) return '';
    return r.createdByUid === this.myUid ? 'Vos' : this.coupleService.getDisplayName(r.createdByUid, c);
  }

  async addReminder() {
    if (!this.newTitle.trim() || !this.coupleId) return;
    await this.coupleService.addReminder(this.coupleId, this.newTitle.trim());
    this.newTitle = '';
  }

  async toggle(r: Reminder) {
    await this.coupleService.toggleReminder(this.coupleId, r.id, !r.done);
  }

  async deleteReminder(r: Reminder) {
    await this.coupleService.deleteReminder(this.coupleId, r.id);
  }

  async clearDone() {
    await Promise.all(this.done().map(r => this.coupleService.deleteReminder(this.coupleId, r.id)));
  }
}
