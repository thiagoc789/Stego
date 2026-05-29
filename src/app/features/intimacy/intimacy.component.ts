import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { IntimacyDay } from '../../core/models/couple.model';

interface CalCell { day: number | null; dateStr: string | null; isToday: boolean; isMarked: boolean; isFuture: boolean; count: number; }

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
                  [class.selected]="selectedCell()?.dateStr === cell.dateStr"
                  [disabled]="cell.isFuture"
                  (click)="tapDay(cell)">
                  {{ cell.day }}
                  @if (cell.isMarked) {
                    <span class="fire-dot">
                      @if (cell.count > 1) { <span class="count-badge">{{ cell.count }}</span> }
                      🔥
                    </span>
                  }
                </button>
              }
            }
          </div>
        </div>

        <!-- Action panel for selected day -->
        @if (selectedCell()) {
          <div class="action-card">
            <div class="action-top">
              <div class="action-info">
                <span class="action-date">{{ formatDate(selectedCell()!.dateStr!) }}</span>
                <span class="action-count">🔥 {{ selectedCell()!.count }} {{ selectedCell()!.count === 1 ? 'vez' : 'veces' }} este día</span>
              </div>
              <button class="action-close" (click)="selectedCell.set(null)">✕</button>
            </div>
            <div class="action-btns">
              <button class="btn-add" (click)="addToSelected()">+ Agregar otro</button>
              <button class="btn-remove" (click)="removeFromSelected()">− Quitar uno</button>
            </div>
          </div>
        }

        <!-- Recent list -->
        @if (recentDays().length > 0) {
          <div class="recent-card">
            <p class="recent-label">Últimos momentos</p>
            @for (d of recentDays(); track d.date) {
              <div class="recent-row">
                <span class="recent-icon">🔥{{ (d.count ?? 1) > 1 ? ' ×' + (d.count ?? 1) : '' }}</span>
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
      background: linear-gradient(90deg, rgba(0,0,0,0.07) 25%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.07) 75%);
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
    }
    .skeleton-cal {
      height: 300px; border-radius: 18px;
      background: linear-gradient(90deg, rgba(0,0,0,0.07) 25%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.07) 75%);
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
    .stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .stat-num { font-size: 2rem; font-weight: 800; color: white; line-height: 1; }
    .stat-lbl { font-size: 0.68rem; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .stat-fire { font-size: 2rem; }

    /* Calendar */
    .cal-card {
      background: white;
      border-radius: 18px;
      padding: 1rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.06);
    }
    .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
    .cal-nav {
      background: none; border: none; font-size: 1.5rem; color: #9f1239;
      cursor: pointer; padding: 0.1rem 0.5rem; border-radius: 8px; line-height: 1;
      &:hover { background: #fff1f2; }
    }
    .cal-title { font-size: 0.88rem; font-weight: 700; color: #333; text-transform: capitalize; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .cal-weekday { text-align: center; font-size: 0.62rem; font-weight: 700; color: #ccc; text-transform: uppercase; padding: 0.3rem 0; }
    .cal-cell {
      aspect-ratio: 1; border-radius: 50%; border: none; background: none;
      font-size: 0.78rem; color: #aaa; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1px;
      transition: background 0.15s, transform 0.1s;
      &.empty { cursor: default; }
      &.today { background: #ddd6fe; color: #5b21b6; font-weight: 800; box-shadow: 0 0 0 2px #7c3aed; }
      &.marked { background: #ffe4e6; color: #be123c; font-weight: 700; }
      &.selected { background: #fecdd3; box-shadow: 0 0 0 2px #e11d48; }
      &.future { cursor: default; opacity: 0.3; }
      &:not(.empty):not(.future):hover { background: #ffe4e6; transform: scale(1.08); }
    }
    .fire-dot { font-size: 0.65rem; line-height: 1; display: flex; align-items: center; gap: 1px; }
    .count-badge { font-size: 0.58rem; font-weight: 800; color: #be123c; }

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

    /* Action panel */
    .action-card {
      background: white; border-radius: 18px;
      padding: 1rem 1.1rem;
      box-shadow: 0 4px 18px rgba(190,18,60,0.15);
      border: 1.5px solid #fecdd3;
      display: flex; flex-direction: column; gap: 0.75rem;
      animation: slideIn 0.18s ease;
    }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    .action-top { display: flex; align-items: flex-start; justify-content: space-between; }
    .action-info { display: flex; flex-direction: column; gap: 2px; }
    .action-date { font-size: 0.72rem; color: #aaa; text-transform: capitalize; }
    .action-count { font-size: 1rem; font-weight: 700; color: #be123c; }
    .action-close {
      background: none; border: none; font-size: 0.85rem; color: #ccc;
      cursor: pointer; padding: 2px 6px; border-radius: 6px;
      &:hover { background: #f5f5f5; color: #888; }
    }
    .action-btns { display: flex; gap: 0.6rem; }
    .btn-add {
      flex: 1; padding: 0.55rem; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #be123c, #9f1239);
      color: white; font-size: 0.85rem; font-weight: 700;
      cursor: pointer; font-family: inherit;
      &:hover { opacity: 0.9; }
    }
    .btn-remove {
      flex: 1; padding: 0.55rem; border-radius: 12px;
      border: 1.5px solid #fecdd3; background: white;
      color: #be123c; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; font-family: inherit;
      &:hover { background: #fff1f2; }
    }

    /* Recent */
    .recent-card {
      background: white; border-radius: 18px;
      padding: 0.9rem 1rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.06);
      display: flex; flex-direction: column; gap: 0.3rem;
    }
    .recent-label { font-size: 0.68rem; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 0.4rem; }
    .recent-row {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.4rem 0; border-bottom: 1px solid #fafafa;
      &:last-child { border-bottom: none; }
    }
    .recent-icon { font-size: 0.9rem; font-weight: 700; color: #be123c; }
    .recent-date { font-size: 0.85rem; color: #555; }
  `],
})
export class IntimacyComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService   = inject(AuthService);
  private destroyRef    = inject(DestroyRef);

  days     = signal<IntimacyDay[]>([]);
  loading  = signal(true);
  calYear  = signal(new Date().getFullYear());
  calMonth = signal(new Date().getMonth());
  selectedCell = signal<CalCell | null>(null);

  private coupleId = '';
  private myUid    = '';

  markedSet = computed(() => new Set(this.days().map(d => d.date)));

  daysMap = computed(() => {
    const map = new Map<string, number>();
    this.days().forEach(d => map.set(d.date, d.count ?? 1));
    return map;
  });

  monthCount = computed(() => {
    const y = this.calYear(), m = this.calMonth();
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
    return this.days()
      .filter(d => d.date.startsWith(prefix))
      .reduce((sum, d) => sum + (d.count ?? 1), 0);
  });

  totalCount = computed(() => this.days().reduce((sum, d) => sum + (d.count ?? 1), 0));

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
    const daysMap  = this.daysMap();
    const cells: CalCell[] = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, dateStr: null, isToday: false, isMarked: false, isFuture: false, count: 0 });
    for (let d = 1; d <= daysInM; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr: ds, isToday: ds === today, isMarked: marked.has(ds), isFuture: ds > today, count: daysMap.get(ds) ?? 0 });
    }
    return cells;
  });

  ngOnInit() {
    setTimeout(() => this.loading.set(false), 8000);

    this.authService.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      switchMap(user => {
        this.coupleId = user!.coupleId!;
        this.myUid    = user!.uid;
        return this.coupleService.getCouple$(this.coupleId).pipe(take(1));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.coupleService.getIntimacyDays$(this.coupleId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: d => { this.days.set(d); this.loading.set(false); },
            error: () => this.loading.set(false),
          });
      },
      error: () => this.loading.set(false),
    });
  }

  tapDay(cell: CalCell) {
    if (cell.isFuture || !cell.dateStr) return;
    if (cell.isMarked) {
      this.selectedCell.set(cell);
    } else {
      this.coupleService.addIntimacyMomento(this.coupleId, cell.dateStr, this.myUid);
    }
  }

  async addToSelected() {
    const cell = this.selectedCell();
    if (!cell?.dateStr) return;
    this.selectedCell.set(null);
    await this.coupleService.addIntimacyMomento(this.coupleId, cell.dateStr, this.myUid);
  }

  async removeFromSelected() {
    const cell = this.selectedCell();
    if (!cell?.dateStr) return;
    this.selectedCell.set(null);
    await this.coupleService.removeIntimacyMomento(this.coupleId, cell.dateStr);
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
