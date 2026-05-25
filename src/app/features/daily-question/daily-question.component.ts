import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Couple, DailyAnswer } from '../../core/models/couple.model';
import { KnowledgeGameComponent } from './knowledge-game.component';

interface CalDay {
  day: number | null;
  dateStr: string | null;
  hasAnswer: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-daily-question',
  standalone: true,
  imports: [FormsModule, KnowledgeGameComponent],
  template: `
    <div class="daily-page">

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="skeleton-card"></div>
        <div class="skeleton-card short"></div>
      } @else {

        <!-- Question card -->
        <div class="question-card" [class.compact]="!!myAnswer()">
          <span class="question-label">Pregunta del día</span>
          <p class="question-text">{{ question }}</p>
          <div class="countdown-row">
            <span class="countdown-icon">⏱</span>
            <span class="countdown">Próxima en {{ countdown() }}</span>
          </div>
        </div>

        <!-- Input (before answering) -->
        @if (!myAnswer()) {
          <div class="input-section">
            <textarea
              class="answer-input"
              [(ngModel)]="answerText"
              placeholder="¿Qué respondés vos? 💕"
              rows="4"
            ></textarea>
            <button class="submit-btn" (click)="submitAnswer()" [disabled]="!answerText.trim()">
              Enviar respuesta
            </button>
          </div>
        }

        <!-- Answers (only after I answered) -->
        @if (myAnswer()) {
          <div class="answers">
            <div class="answer-card mine">
              <span class="answer-who">{{ myName() }}</span>
              <p class="answer-text">{{ myAnswer() }}</p>
            </div>

            @if (partnerAnswer()) {
              <div class="answer-card partner">
                <span class="answer-who">{{ partnerName() }} ♡</span>
                <p class="answer-text">{{ partnerAnswer() }}</p>
              </div>
            } @else {
              <div class="waiting-card">
                <span>💭</span>
                <p>Esperando la respuesta de {{ partnerName() }}...</p>
              </div>
            }
          </div>
        }

        <!-- Knowledge game -->
        <div class="section-divider"><span></span><span>✦</span><span></span></div>
        <app-knowledge-game />

        <!-- Calendar history -->
        @if (history().length > 0) {
          <div class="section-divider"><span></span><span>📖</span><span></span></div>
          <div class="calendar-section">
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
                  <button
                    class="cal-cell"
                    [class.today]="cell.isToday"
                    [class.has-answer]="cell.hasAnswer"
                    [class.selected]="selectedDate() === cell.dateStr"
                    (click)="cell.hasAnswer ? selectDate(cell.dateStr!) : null"
                  >
                    {{ cell.day }}
                    @if (cell.hasAnswer) { <span class="cal-dot"></span> }
                  </button>
                }
              }
            </div>

            @if (selectedEntry()) {
              <div class="cal-detail">
                <div class="cal-detail-date">{{ formatDate(selectedEntry()!.date) }}</div>
                <p class="cal-detail-q">{{ coupleService.getQuestionById(selectedEntry()!.questionId) }}</p>
                <div class="history-answers">
                  @if (isUser1 ? selectedEntry()!.answerUser1 : selectedEntry()!.answerUser2; as mine) {
                    <div class="h-answer mine">
                      <span class="h-who">{{ myName() }}</span>
                      <span class="h-text">{{ mine }}</span>
                    </div>
                  }
                  @if (isUser1 ? selectedEntry()!.answerUser2 : selectedEntry()!.answerUser1; as theirs) {
                    <div class="h-answer partner">
                      <span class="h-who">{{ partnerName() }}</span>
                      <span class="h-text">{{ theirs }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .daily-page {
      padding: 1.2rem;
      max-width: 480px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }

    /* Skeleton */
    .skeleton-card {
      height: 160px; border-radius: 22px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      &.short { height: 80px; border-radius: 16px; }
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Question card */
    .question-card {
      background: linear-gradient(135deg, #e91e63 0%, #ad1457 60%, #7b1fa2 100%);
      border-radius: 22px; padding: 1.8rem 1.5rem 1.2rem; color: white;
      box-shadow: 0 8px 28px rgba(233, 30, 99, 0.3); position: relative; overflow: hidden;
      transition: padding 0.3s ease;
      &::before { content: '♡'; position: absolute; top: -15px; right: -10px; font-size: 7rem; color: rgba(255,255,255,0.07); line-height: 1; }
      &.compact { padding: 1rem 1.2rem; }
      &.compact .question-text { font-size: 0.95rem; margin-bottom: 0.6rem; }
    }
    .question-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.7); display: block; margin-bottom: 0.8rem; }
    .compact .question-label { display: none; }
    .question-text { margin: 0 0 1rem; font-size: 1.2rem; font-weight: 500; line-height: 1.6; position: relative; transition: font-size 0.3s; }
    .countdown-row {
      display: flex; align-items: center; gap: 6px;
      background: rgba(0,0,0,0.18); border-radius: 20px;
      padding: 4px 12px; width: fit-content;
    }
    .countdown-icon { font-size: 0.8rem; }
    .countdown { font-size: 0.75rem; color: rgba(255,255,255,0.9); font-variant-numeric: tabular-nums; letter-spacing: 0.5px; }

    /* Answers */
    .answers { display: flex; flex-direction: column; gap: 0.9rem; }
    .answer-card {
      border-radius: 18px; padding: 1rem 1.2rem;
      box-shadow: 0 3px 12px rgba(0,0,0,0.07);
      &.mine    { background: white; border-left: 4px solid #e91e63; }
      &.partner { background: white; border-left: 4px solid #9c27b0; }
    }
    .answer-who { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 0.5rem; }
    .mine    .answer-who { color: #e91e63; }
    .partner .answer-who { color: #9c27b0; }
    .answer-text { margin: 0; font-size: 0.95rem; line-height: 1.6; color: #333; }

    .waiting-card {
      text-align: center; padding: 1.5rem; background: white;
      border-radius: 16px; display: flex; flex-direction: column;
      align-items: center; gap: 0.5rem; opacity: 0.7;
      span { font-size: 2rem; }
      p { margin: 0; font-size: 0.85rem; color: #aaa; }
    }

    /* Input */
    .input-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .answer-input {
      width: 100%; border: 1.5px solid #fce4ec; border-radius: 16px;
      padding: 1rem; font-size: 0.95rem; font-family: inherit;
      line-height: 1.6; resize: none; outline: none; background: white;
      box-sizing: border-box; box-shadow: 0 3px 12px rgba(233, 30, 99, 0.07);
      transition: border-color 0.2s;
      &:focus { border-color: #e91e63; }
      &::placeholder { color: #ddd; }
    }
    .submit-btn {
      padding: 0.85rem; border-radius: 14px; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; font-size: 0.95rem; font-weight: 600;
      cursor: pointer; box-shadow: 0 4px 14px rgba(233, 30, 99, 0.35);
      transition: all 0.2s ease;
      &:not(:disabled):hover { transform: translateY(-1px); }
      &:disabled { background: #eee; color: #bbb; box-shadow: none; cursor: default; }
    }

    .section-divider {
      display: flex; align-items: center; gap: 0.75rem;
      span:first-child, span:last-child { flex: 1; height: 1px; background: #eee; }
      span:nth-child(2) { font-size: 0.85rem; color: #e0a0c0; }
    }

    /* Calendar */
    .calendar-section { background: white; border-radius: 20px; padding: 1rem; box-shadow: 0 3px 14px rgba(0,0,0,0.06); }
    .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
    .cal-nav { background: none; border: none; font-size: 1.4rem; color: #e91e63; cursor: pointer; padding: 0.2rem 0.6rem; border-radius: 8px; line-height: 1; &:hover { background: #fce4ec; } }
    .cal-title { font-size: 0.88rem; font-weight: 700; color: #333; text-transform: capitalize; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .cal-weekday { text-align: center; font-size: 0.65rem; font-weight: 700; color: #ccc; text-transform: uppercase; padding: 0.3rem 0; }
    .cal-cell {
      aspect-ratio: 1; border-radius: 50%; border: none; background: none;
      font-size: 0.8rem; color: #444; cursor: default;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      position: relative; gap: 1px;
      &.empty { background: none; }
      &.today { background: #fce4ec; color: #e91e63; font-weight: 700; }
      &.has-answer { cursor: pointer; color: #333; font-weight: 600; &:hover { background: #f3e5f5; } }
      &.selected { background: #e91e63 !important; color: white !important; }
    }
    .cal-dot { width: 4px; height: 4px; border-radius: 50%; background: #e91e63; flex-shrink: 0; .selected & { background: white; } }

    /* Calendar detail */
    .cal-detail {
      margin-top: 0.8rem; padding-top: 0.8rem;
      border-top: 1px solid #f5f5f5;
      display: flex; flex-direction: column; gap: 0.45rem;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .cal-detail-date { font-size: 0.7rem; color: #bbb; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .cal-detail-q { margin: 0; font-size: 0.88rem; color: #666; font-style: italic; line-height: 1.4; }
    .history-answers { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.2rem; }
    .h-answer { display: flex; gap: 8px; align-items: baseline; font-size: 0.83rem; }
    .h-answer.mine    .h-who { color: #e91e63; }
    .h-answer.partner .h-who { color: #9c27b0; }
    .h-who { font-weight: 700; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; flex-shrink: 0; }
    .h-text { color: #444; line-height: 1.4; }
  `],
})
export class DailyQuestionComponent implements OnInit, OnDestroy {
  private coupleService_ = inject(CoupleService);
  private authService    = inject(AuthService);
  private destroyRef     = inject(DestroyRef);

  readonly coupleService = this.coupleService_;

  question    = '';
  answerText  = '';
  isUser1     = true;

  myAnswer      = signal<string | null>(null);
  partnerAnswer = signal<string | null>(null);
  myName        = signal('Vos');
  partnerName   = signal('Tu pareja');
  countdown     = signal('--:--:--');
  history       = signal<DailyAnswer[]>([]);
  loading       = signal(true);

  // Calendar
  calYear  = signal(new Date().getFullYear());
  calMonth = signal(new Date().getMonth());
  selectedDate = signal<string | null>(null);

  historyMap = computed(() => {
    const m = new Map<string, DailyAnswer>();
    this.history().forEach(a => m.set(a.date, a));
    return m;
  });

  calMonthLabel = computed(() =>
    new Date(this.calYear(), this.calMonth(), 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  );

  calDays = computed((): CalDay[] => {
    const y = this.calYear(), m = this.calMonth();
    const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
    const offset   = firstDow === 0 ? 6 : firstDow - 1; // Mon-first
    const daysInM  = new Date(y, m + 1, 0).getDate();
    const today    = this.coupleService_.todayKey();
    const cells: CalDay[] = [];

    for (let i = 0; i < offset; i++) cells.push({ day: null, dateStr: null, hasAnswer: false, isToday: false });
    for (let d = 1; d <= daysInM; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, hasAnswer: this.historyMap().has(dateStr), isToday: dateStr === today });
    }
    return cells;
  });

  selectedEntry = computed(() =>
    this.selectedDate() ? (this.historyMap().get(this.selectedDate()!) ?? null) : null
  );

  private coupleId = '';
  private uid = '';
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.question = this.coupleService_.getTodayQuestion();
    this.startCountdown();

    this.authService.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      switchMap(user => {
        this.coupleId = user!.coupleId!;
        this.uid = user!.uid;
        return this.coupleService_.getCouple$(this.coupleId).pipe(take(1));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((couple: Couple) => {
      this.isUser1 = couple.user1Uid === this.uid;
      this.myName.set(this.isUser1 ? couple.user1DisplayName : (couple.user2DisplayName ?? 'Vos'));
      this.partnerName.set(this.isUser1 ? (couple.user2DisplayName ?? 'Tu pareja') : couple.user1DisplayName);

      this.coupleService_.getTodayAnswers$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(answers => {
          this.myAnswer.set(answers ? (this.isUser1 ? answers.answerUser1 : answers.answerUser2) : null);
          this.partnerAnswer.set(answers ? (this.isUser1 ? answers.answerUser2 : answers.answerUser1) : null);
          this.loading.set(false);
        });

      this.coupleService_.getDailyHistory$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(h => {
          this.history.set(h);
          // Navigate calendar to latest month with answers
          if (h.length > 0 && !this.selectedDate()) {
            const latest = h[0].date.split('-');
            this.calYear.set(+latest[0]);
            this.calMonth.set(+latest[1] - 1);
          }
        });
    });
  }

  ngOnDestroy() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  async submitAnswer() {
    if (!this.answerText.trim() || !this.coupleId) return;
    await this.coupleService_.saveAnswer(this.coupleId, this.uid, this.answerText.trim(), this.isUser1);
    this.answerText = '';
  }

  selectDate(dateStr: string) {
    this.selectedDate.set(this.selectedDate() === dateStr ? null : dateStr);
  }

  prevMonth() {
    if (this.calMonth() === 0) { this.calYear.update(y => y - 1); this.calMonth.set(11); }
    else this.calMonth.update(m => m - 1);
    this.selectedDate.set(null);
  }

  nextMonth() {
    if (this.calMonth() === 11) { this.calYear.update(y => y + 1); this.calMonth.set(0); }
    else this.calMonth.update(m => m + 1);
    this.selectedDate.set(null);
  }

  formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  private startCountdown() {
    const tick = () => {
      const ms = CoupleService.msUntilMidnightColombia();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1_000);
      this.countdown.set(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    this.tickInterval = setInterval(tick, 1_000);
  }
}
