import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { IntimacyDay } from '../../core/models/couple.model';

interface CalCell { day: number | null; dateStr: string | null; isToday: boolean; isMarked: boolean; isFuture: boolean; }

@Component({
  selector: 'app-intimacy',
  standalone: true,
  template: `
    <div class="page">

      @if (loading()) {
        <div class="skeleton-header"></div>
        <div class="skeleton-cal"></div>
      } @else {

        <!-- Stats header -->
        <div class="stats-card">
          <div class="stat">
            <span class="stat-num">{{ monthCount() }}</span>
            <span class="stat-lbl">este mes</span>
          </div>
          <div class="stat-fire">🔥</div>
          <div class="stat">
            <span class="stat-num">{{ totalCount() }}</span>
            <span class="stat-lbl">en total</span>
          </div>
        </div>

        <!-- Streak -->
        @if (streak() > 0) {
          <div class="streak-card">
            <span class="streak-fire">🔥</span>
            <div class="streak-info">
              <span class="streak-num">{{ streak() }} {{ streak() === 1 ? 'noche' : 'noches' }} seguidas</span>
              <span class="streak-lbl">sin apagar el fuego 🌙</span>
            </div>
          </div>
        }

        <!-- Calendar -->
        <div class="cal-card">
          <div class="cal-header">
            <button class="cal-nav" (click)="prevMonth()">‹</button>
            <span class="cal-title">{{ calMonthLabel() }}</span>
            <button class="cal-nav" (click)="nextMonth()">›</button>
          </div>
          <div class="cal-grid">
            @for (h of ['L','M','M','J','V','S','D']; track h + $index) {
              <div class="cal-weekday">{{ h }}</div>
            }
            @for (cell of calDays(); track $index) {
              @if (cell.day === null) {
                <div class="cal-cell empty"></div>
              } @else {
                <button class="cal-cell"
                  [class.today]="cell.isToday"
                  [class.marked]="cell.isMarked"
                  [class.future]="cell.isFuture"
                  [disabled]="cell.isFuture"
                  (click)="!cell.isFuture && toggleDay(cell.dateStr!)">
                  {{ cell.day }}
                  @if (cell.isMarked) { <span class="fire-dot">🔥</span> }
                </button>
              }
            }
          </div>
        </div>

        <!-- Recent list -->
        @if (recentDays().length > 0) {
          <div class="recent-card">
            <p class="recent-label">Últimas llamas</p>
            @for (d of recentDays(); track d.date) {
              <div class="recent-row">
                <span class="recent-icon">🔥</span>
                <span class="recent-date">{{ formatDate(d.date) }}</span>
              </div>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page {
      padding: 1rem;
      max-width: 480px;
      margin: 0 auto;
      padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    /* Skeletons */
    .skeleton-header {
      height: 90px; border-radius: 18px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    .skeleton-cal {
      height: 300px; border-radius: 18px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Stats */
    .stats-card {
      background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%);
      border-radius: 18px;
      padding: 1.2rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      box-shadow: 0 6px 24px rgba(153,27,27,0.45);
    }
    .stat {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .stat-num {
      font-size: 2rem; font-weight: 800; color: white; line-height: 1;
    }
    .stat-lbl {
      font-size: 0.68rem; color: rgba(255,255,255,0.65);
      text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
    }
    .stat-fire { font-size: 2rem; }

    /* Calendar */
    .cal-card {
      background: white;
      border-radius: 18px;
      padding: 1rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.06);
    }
    .cal-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem;
    }
    .cal-nav {
      background: none; border: none; font-size: 1.5rem; color: #9f1239;
      cursor: pointer; padding: 0.1rem 0.5rem; border-radius: 8px; line-height: 1;
      &:hover { background: #fff1f2; }
    }
    .cal-title {
      font-size: 0.88rem; font-weight: 700; color: #333; text-transform: capitalize;
    }
    .cal-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
    }
    .cal-weekday {
      text-align: center; font-size: 0.62rem; font-weight: 700;
      color: #ccc; text-transform: uppercase; padding: 0.3rem 0;
    }
    .cal-cell {
      aspect-ratio: 1; border-radius: 50%; border: none; background: none;
      font-size: 0.78rem; color: #aaa; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1px;
      transition: background 0.15s, transform 0.1s;
      &.empty { cursor: default; }
      &.today { background: #5b21b6; color: white; font-weight: 800; }
      &.marked { background: #fff1f2; color: #9f1239; font-weight: 600; }
      &.future { cursor: default; opacity: 0.3; }
      &:not(.empty):not(.future):hover { background: #fff1f2; transform: scale(1.08); }
    }
    .fire-dot { font-size: 0.5rem; line-height: 1; }

    /* Streak */
    .streak-card {
      background: linear-gradient(135deg, #1c0202 0%, #450a0a 60%, #7f1d1d 100%);
      border-radius: 16px;
      padding: 0.85rem 1.2rem;
      display: flex; align-items: center; gap: 0.9rem;
      box-shadow: 0 4px 18px rgba(153,27,27,0.4);
    }
    .streak-fire { font-size: 1.8rem; }
    .streak-info { display: flex; flex-direction: column; }
    .streak-num { font-size: 1.1rem; font-weight: 800; color: white; line-height: 1.2; }
    .streak-lbl { font-size: 0.68rem; color: rgba(255,200,150,0.7); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

    /* Recent */
    .recent-card {
      background: white; border-radius: 18px;
      padding: 0.9rem 1rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.06);
      display: flex; flex-direction: column; gap: 0.3rem;
    }
    .recent-label {
      font-size: 0.68rem; font-weight: 700; color: #f87171;
      text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.4rem;
    }
    .recent-row {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.4rem 0; border-bottom: 1px solid #fafafa;
      &:last-child { border-bottom: none; }
    }
    .recent-icon { font-size: 0.9rem; }
    .recent-date { font-size: 0.85rem; color: #555; }
  `],
})
export class IntimacyComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService   = inject(AuthService);
  private destroyRef    = inject(DestroyRef);

  days    = signal<IntimacyDay[]>([]);
  loading = signal(true);
  calYear  = signal(new Date().getFullYear());
  calMonth = signal(new Date().getMonth());

  private coupleId = '';
  private myUid    = '';

  markedSet = computed(() => new Set(this.days().map(d => d.date)));

  monthCount = computed(() => {
    const y = this.calYear(), m = this.calMonth();
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
    return this.days().filter(d => d.date.startsWith(prefix)).length;
  });

  totalCount = computed(() => this.days().length);

  recentDays = computed(() => this.days().slice(0, 8));

  streak = computed(() => {
    const marked = this.markedSet();
    const today = this.coupleService.todayKey();
    let count = 0;
    const col = new Date(Date.now() - 5 * 3_600_000);
    if (!marked.has(today)) {
      col.setUTCDate(col.getUTCDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const ds = `${col.getUTCFullYear()}-${String(col.getUTCMonth()+1).padStart(2,'0')}-${String(col.getUTCDate()).padStart(2,'0')}`;
      if (marked.has(ds)) { count++; col.setUTCDate(col.getUTCDate() - 1); }
      else break;
    }
    return count;
  });

  calMonthLabel = computed(() =>
    new Date(this.calYear(), this.calMonth(), 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  );

  calDays = computed((): CalCell[] => {
    const y = this.calYear(), m = this.calMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const offset   = firstDow === 0 ? 6 : firstDow - 1;
    const daysInM  = new Date(y, m + 1, 0).getDate();
    const today    = this.coupleService.todayKey();
    const marked   = this.markedSet();
    const cells: CalCell[] = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, dateStr: null, isToday: false, isMarked: false, isFuture: false });
    for (let d = 1; d <= daysInM; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr: ds, isToday: ds === today, isMarked: marked.has(ds), isFuture: ds > today });
    }
    return cells;
  });

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
    ).subscribe(() => {
      this.coupleService.getIntimacyDays$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(d => { this.days.set(d); this.loading.set(false); });
    });
  }

  async toggleDay(dateStr: string) {
    await this.coupleService.toggleIntimacyDay(this.coupleId, dateStr, this.myUid);
  }

  prevMonth() {
    if (this.calMonth() === 0) { this.calYear.update(y => y - 1); this.calMonth.set(11); }
    else this.calMonth.update(m => m - 1);
  }
  nextMonth() {
    if (this.calMonth() === 11) { this.calYear.update(y => y + 1); this.calMonth.set(0); }
    else this.calMonth.update(m => m + 1);
  }

  formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
