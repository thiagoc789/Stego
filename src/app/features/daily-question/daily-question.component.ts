import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Couple, DailyAnswer, IntimacyDay, KnowledgeRound } from '../../core/models/couple.model';
import { KnowledgeGameComponent } from './knowledge-game.component';

interface CalDay { day: number | null; dateStr: string | null; hasEntry: boolean; hasIntimacy: boolean; isToday: boolean; }
interface DayEntry { daily?: DailyAnswer; knowledge?: KnowledgeRound; }

@Component({
  selector: 'app-daily-question',
  standalone: true,
  imports: [FormsModule, KnowledgeGameComponent],
  template: `
    <div class="daily-page">

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
          @if (streak() > 0) {
            <div class="streak-badge">🔥 {{ streak() }} {{ streak() === 1 ? 'día' : 'días' }} seguidos</div>
          }
        </div>

        <!-- Input (before answering) -->
        @if (!myAnswer()) {
          <div class="input-section">
            <textarea class="answer-input" [(ngModel)]="answerText"
              placeholder="¿Qué respondés vos? 💕" rows="4"></textarea>
            <button class="submit-btn" (click)="submitAnswer()" [disabled]="!answerText.trim()">
              Enviar respuesta
            </button>
          </div>
        }

        <!-- Answers (blind reveal: only after I answered) -->
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
        @if (combinedMap().size > 0) {
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
                  <button class="cal-cell"
                    [class.today]="cell.isToday"
                    [class.has-entry]="cell.hasEntry"
                    (click)="cell.hasEntry ? openPopup(cell.dateStr!) : null">
                    {{ cell.day }}
                    <div class="cal-dots">
                      @if (cell.hasEntry) { <span class="cal-dot pink"></span> }
                      @if (cell.hasIntimacy) { <span class="cal-dot red"></span> }
                    </div>
                  </button>
                }
              }
            </div>
          </div>
        }

      }
    </div>

    <!-- Day popup -->
    @if (popupDate()) {
      <div class="popup-overlay" (click)="closePopup()">
        <div class="popup-card" (click)="$event.stopPropagation()">
          <button class="popup-close" (click)="closePopup()">✕</button>
          <div class="popup-date">{{ formatDate(popupDate()!) }}</div>

          @if (popupEntry()?.daily; as d) {
            <div class="popup-section">
              <div class="popup-label">💕 Pregunta del día</div>
              <p class="popup-question">{{ coupleService.getQuestionById(d.questionId) }}</p>
              <div class="popup-answers">
                @if (isUser1 ? d.answerUser1 : d.answerUser2; as mine) {
                  <div class="pa mine"><span class="pa-who">{{ myName() }}</span><span class="pa-text">{{ mine }}</span></div>
                }
                @if (isUser1 ? d.answerUser2 : d.answerUser1; as theirs) {
                  <div class="pa partner"><span class="pa-who">{{ partnerName() }}</span><span class="pa-text">{{ theirs }}</span></div>
                }
              </div>
            </div>
          }

          @if (popupEntry()?.knowledge; as kr) {
            <div class="popup-section">
              <div class="popup-label">🧠 Juego de conocimiento</div>
              <p class="popup-question">{{ coupleService.getKnowledgeQuestionById(kr.questionId) }}</p>
              <div class="kr-grid">
                <!-- User1 column -->
                <div class="kr-col" [class.mine]="isUser1" [class.partner]="!isUser1">
                  <span class="kr-name">{{ isUser1 ? myName() : partnerName() }}</span>
                  <div class="kr-block">
                    <span class="kr-lbl">Respondió</span>
                    <span class="kr-val">{{ kr.user1OwnAnswer ?? '—' }}</span>
                  </div>
                  <div class="kr-block guess">
                    <span class="kr-lbl">{{ !isUser1 ? myName() : partnerName() }} adivinó</span>
                    <div class="kr-guess-row">
                      <span class="kr-val">{{ kr.user2Guess ?? '—' }}</span>
                      @if (kr.user2Guess) {
                        <span class="kr-badge" [class.ok]="kr.user2Guess === kr.user1OwnAnswer">
                          {{ kr.user2Guess === kr.user1OwnAnswer ? '✓' : '✗' }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
                <!-- User2 column -->
                <div class="kr-col" [class.mine]="!isUser1" [class.partner]="isUser1">
                  <span class="kr-name">{{ !isUser1 ? myName() : partnerName() }}</span>
                  <div class="kr-block">
                    <span class="kr-lbl">Respondió</span>
                    <span class="kr-val">{{ kr.user2OwnAnswer ?? '—' }}</span>
                  </div>
                  <div class="kr-block guess">
                    <span class="kr-lbl">{{ isUser1 ? myName() : partnerName() }} adivinó</span>
                    <div class="kr-guess-row">
                      <span class="kr-val">{{ kr.user1Guess ?? '—' }}</span>
                      @if (kr.user1Guess) {
                        <span class="kr-badge" [class.ok]="kr.user1Guess === kr.user2OwnAnswer">
                          {{ kr.user1Guess === kr.user2OwnAnswer ? '✓' : '✗' }}
                        </span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .daily-page {
      padding: 1.2rem 1.2rem calc(2rem + env(safe-area-inset-bottom, 0px));
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
      background-size: 200% 100%; animation: shimmer 1.4s infinite;
      &.short { height: 80px; border-radius: 16px; }
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Question card */
    .question-card {
      background: linear-gradient(135deg, #e91e63 0%, #ad1457 60%, #7b1fa2 100%);
      border-radius: 22px; padding: 1.8rem 1.5rem 1.2rem; color: white;
      box-shadow: 0 8px 28px rgba(233,30,99,0.3); position: relative; overflow: hidden;
      transition: padding 0.3s ease;
      &::before { content: '♡'; position: absolute; top: -15px; right: -10px; font-size: 7rem; color: rgba(255,255,255,0.07); line-height: 1; }
      &.compact { padding: 1rem 1.2rem; }
      &.compact .question-label { display: none; }
      &.compact .question-text { font-size: 0.95rem; margin-bottom: 0.6rem; }
    }
    .question-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.7); display: block; margin-bottom: 0.8rem; }
    .question-text { margin: 0 0 1rem; font-size: 1.2rem; font-weight: 500; line-height: 1.6; transition: font-size 0.3s; }
    .countdown-row { display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.18); border-radius: 20px; padding: 4px 12px; width: fit-content; }
    .countdown-icon { font-size: 0.8rem; }
    .countdown { font-size: 0.75rem; color: rgba(255,255,255,0.9); font-variant-numeric: tabular-nums; letter-spacing: 0.5px; }
    .streak-badge { margin-top: 0.5rem; font-size: 0.78rem; font-weight: 700; color: rgba(255,255,255,0.9); background: rgba(0,0,0,0.18); border-radius: 20px; padding: 4px 12px; width: fit-content; }

    /* Answers */
    .answers { display: flex; flex-direction: column; gap: 0.9rem; }
    .answer-card { border-radius: 18px; padding: 1rem 1.2rem; box-shadow: 0 3px 12px rgba(0,0,0,0.07); }
    .answer-card.mine    { background: white; border-left: 4px solid #e91e63; }
    .answer-card.partner { background: white; border-left: 4px solid #9c27b0; }
    .answer-who { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 0.5rem; }
    .mine    .answer-who { color: #e91e63; }
    .partner .answer-who { color: #9c27b0; }
    .answer-text { margin: 0; font-size: 0.95rem; line-height: 1.6; color: #333; }
    .waiting-card { text-align: center; padding: 1.5rem; background: white; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; opacity: 0.7; span { font-size: 2rem; } p { margin: 0; font-size: 0.85rem; color: #aaa; } }

    /* Input */
    .input-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .answer-input { width: 100%; border: 1.5px solid #fce4ec; border-radius: 16px; padding: 1rem; font-size: 0.95rem; font-family: inherit; line-height: 1.6; resize: none; outline: none; background: white; box-sizing: border-box; transition: border-color 0.2s; &:focus { border-color: #e91e63; } &::placeholder { color: #ddd; } }
    .submit-btn { padding: 0.85rem; border-radius: 14px; border: none; background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; font-size: 0.95rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(233,30,99,0.35); transition: all 0.2s ease; &:disabled { background: #eee; color: #bbb; box-shadow: none; cursor: default; } }

    .section-divider { display: flex; align-items: center; gap: 0.75rem; span:first-child, span:last-child { flex: 1; height: 1px; background: #eee; } span:nth-child(2) { font-size: 0.85rem; color: #e0a0c0; } }

    /* Calendar */
    .calendar-section { background: white; border-radius: 20px; padding: 1rem; box-shadow: 0 3px 14px rgba(0,0,0,0.06); }
    .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
    .cal-nav { background: none; border: none; font-size: 1.5rem; color: #e91e63; cursor: pointer; padding: 0.1rem 0.5rem; border-radius: 8px; line-height: 1; &:hover { background: #fce4ec; } }
    .cal-title { font-size: 0.88rem; font-weight: 700; color: #333; text-transform: capitalize; }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
    .cal-weekday { text-align: center; font-size: 0.62rem; font-weight: 700; color: #ccc; text-transform: uppercase; padding: 0.3rem 0; }
    .cal-cell {
      aspect-ratio: 1; border-radius: 50%; border: none; background: none;
      font-size: 0.78rem; color: #aaa; cursor: default;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      position: relative; gap: 1px;
      &.today { background: #fce4ec; color: #e91e63; font-weight: 700; }
      &.has-entry { cursor: pointer; color: #333; font-weight: 600; &:hover { background: #f3e5f5; } }
    }
    .cal-dots { display: flex; gap: 2px; justify-content: center; }
    .cal-dot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; &.pink { background: #e91e63; } &.red { background: #c62828; } }

    /* Popup */
    .popup-overlay {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 1.2rem;
      animation: fadeOverlay 0.2s ease;
    }
    @keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }
    .popup-card {
      background: white; border-radius: 24px;
      width: 100%; max-width: 440px;
      max-height: 80vh; overflow-y: auto;
      padding: 1.4rem 1.4rem 1.6rem;
      position: relative;
      display: flex; flex-direction: column; gap: 1rem;
      animation: slideUp 0.22s ease;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
    }
    @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
    .popup-close {
      position: absolute; top: 1rem; right: 1rem;
      width: 30px; height: 30px; border-radius: 50%; border: none;
      background: #f5f5f5; color: #888; font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      &:hover { background: #eee; color: #333; }
    }
    .popup-date { font-size: 0.75rem; font-weight: 700; color: #bbb; text-transform: uppercase; letter-spacing: 0.8px; padding-right: 2.5rem; }
    .popup-section { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #f5f5f5; &:first-of-type { border-top: none; padding-top: 0; } }
    .popup-label { font-size: 0.8rem; font-weight: 700; color: #999; }
    .popup-question { margin: 0; font-size: 0.95rem; font-weight: 500; color: #333; line-height: 1.5; }
    .popup-answers { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.1rem; }
    /* daily popup answers */
    .pa { display: flex; gap: 8px; align-items: baseline; font-size: 0.85rem; flex-wrap: wrap; }
    .pa.mine    .pa-who { color: #e91e63; }
    .pa.partner .pa-who { color: #9c27b0; }
    .pa-who { font-weight: 700; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; flex-shrink: 0; }
    .pa-text { color: #444; line-height: 1.4; }

    /* knowledge two-column grid */
    .kr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-top: 0.2rem; }
    .kr-col {
      border-radius: 14px; padding: 0.75rem 0.8rem;
      display: flex; flex-direction: column; gap: 0.55rem;
      &.mine    { background: #fff0f5; border: 1.5px solid #fce4ec; }
      &.partner { background: #f5f0ff; border: 1.5px solid #ede7f6; }
    }
    .kr-name {
      font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
      .mine &    { color: #e91e63; }
      .partner & { color: #9c27b0; }
    }
    .kr-block { display: flex; flex-direction: column; gap: 2px; }
    .kr-block.guess { padding-top: 0.45rem; border-top: 1px dashed #eee; }
    .kr-lbl { font-size: 0.62rem; color: #bbb; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600; }
    .kr-val { font-size: 0.84rem; color: #333; font-weight: 500; line-height: 1.3; }
    .kr-guess-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
    .kr-badge { width: 18px; height: 18px; border-radius: 50%; font-size: 0.65rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; background: #fce4ec; color: #e91e63; &.ok { background: #e8f5e9; color: #4caf50; } }
  `],
})
export class DailyQuestionComponent implements OnInit, OnDestroy {
  private coupleService_ = inject(CoupleService);
  private authService    = inject(AuthService);
  private destroyRef     = inject(DestroyRef);

  readonly coupleService = this.coupleService_;

  question   = '';
  answerText = '';
  isUser1    = true;

  myAnswer          = signal<string | null>(null);
  partnerAnswer     = signal<string | null>(null);
  myName            = signal('Vos');
  partnerName       = signal('Tu pareja');
  countdown         = signal('--:--:--');
  dailyHistory      = signal<DailyAnswer[]>([]);
  knowledgeHistory  = signal<KnowledgeRound[]>([]);
  intimacyDays      = signal<IntimacyDay[]>([]);
  loading           = signal(true);

  calYear  = signal(new Date().getFullYear());
  calMonth = signal(new Date().getMonth());
  popupDate = signal<string | null>(null);

  combinedMap = computed((): Map<string, DayEntry> => {
    const m = new Map<string, DayEntry>();
    this.dailyHistory().forEach(d => m.set(d.date, { ...(m.get(d.date) ?? {}), daily: d }));
    this.knowledgeHistory().forEach(k => m.set(k.date, { ...(m.get(k.date) ?? {}), knowledge: k }));
    return m;
  });

  calMonthLabel = computed(() =>
    new Date(this.calYear(), this.calMonth(), 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  );

  calDays = computed((): CalDay[] => {
    const y = this.calYear(), m = this.calMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const offset   = firstDow === 0 ? 6 : firstDow - 1;
    const daysInM  = new Date(y, m + 1, 0).getDate();
    const today    = this.coupleService_.todayKey();
    const cells: CalDay[] = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, dateStr: null, hasEntry: false, hasIntimacy: false, isToday: false });
    for (let d = 1; d <= daysInM; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr: ds, hasEntry: this.combinedMap().has(ds), hasIntimacy: this.intimacySet().has(ds), isToday: ds === today });
    }
    return cells;
  });

  popupEntry = computed((): DayEntry | null =>
    this.popupDate() ? (this.combinedMap().get(this.popupDate()!) ?? null) : null
  );

  intimacySet = computed(() => new Set(this.intimacyDays().map(d => d.date)));

  streak = computed(() => {
    const bothAnswered = new Set(
      this.dailyHistory().filter(d => d.answerUser1 && d.answerUser2).map(d => d.date)
    );
    let count = (this.myAnswer() && this.partnerAnswer()) ? 1 : 0;
    const col = new Date(Date.now() - 5 * 3_600_000);
    col.setUTCDate(col.getUTCDate() - 1);
    for (let i = 0; i < 365; i++) {
      const ds = `${col.getUTCFullYear()}-${String(col.getUTCMonth()+1).padStart(2,'0')}-${String(col.getUTCDate()).padStart(2,'0')}`;
      if (bothAnswered.has(ds)) { count++; col.setUTCDate(col.getUTCDate() - 1); }
      else break;
    }
    return count;
  });

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
          this.dailyHistory.set(h);
          if (h.length > 0) this.jumpToLatestMonth(h[0].date);
        });

      this.coupleService_.getKnowledgeHistory$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(h => this.knowledgeHistory.set(h));

      this.coupleService_.getIntimacyDays$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(d => this.intimacyDays.set(d));
    });
  }

  ngOnDestroy() { if (this.tickInterval) clearInterval(this.tickInterval); }

  async submitAnswer() {
    if (!this.answerText.trim() || !this.coupleId) return;
    await this.coupleService_.saveAnswer(this.coupleId, this.uid, this.answerText.trim(), this.isUser1);
    this.answerText = '';
  }

  openPopup(dateStr: string) { this.popupDate.set(dateStr); }
  closePopup() { this.popupDate.set(null); }

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

  private jumpToLatestMonth(dateStr: string) {
    const [y, m] = dateStr.split('-').map(Number);
    this.calYear.set(y); this.calMonth.set(m - 1);
  }

  private startCountdown() {
    const tick = () => {
      const ms = CoupleService.msUntilMidnightColombia();
      const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000), s = Math.floor((ms % 60_000) / 1_000);
      this.countdown.set(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    this.tickInterval = setInterval(tick, 1_000);
  }
}
