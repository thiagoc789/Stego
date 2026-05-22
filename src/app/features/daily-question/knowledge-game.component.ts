import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { KnowledgeQuestion } from '../../core/data/knowledge-questions';
import { KnowledgeRound } from '../../core/models/couple.model';

@Component({
  selector: 'app-knowledge-game',
  standalone: true,
  template: `
    <div class="knowledge-section">
      <div class="knowledge-header">
        <span>🧠</span>
        <div>
          <h3>¿Cuánto nos conocemos?</h3>
          <p>{{ kQuestion?.question }}</p>
        </div>
      </div>

      @if (!myOwnAnswer()) {
        <div class="step-card">
          <p class="step-label">Primero, ¿cuál es <strong>tu</strong> respuesta?</p>
          <div class="options-grid">
            @for (opt of kQuestion?.options; track opt) {
              <button class="option-btn" (click)="answerOwn(opt)">{{ opt }}</button>
            }
          </div>
        </div>
      } @else if (!myGuess()) {
        <div class="step-card">
          <div class="my-answer-badge">
            <span>✓</span> Vos: <strong>{{ myOwnAnswer() }}</strong>
          </div>
          <p class="step-label">¿Qué crees que respondió <strong>{{ partnerName() }}</strong>?</p>
          <div class="options-grid">
            @for (opt of kQuestion?.options; track opt) {
              <button class="option-btn" (click)="saveGuess(opt)">{{ opt }}</button>
            }
          </div>
        </div>
      } @else {
        <div class="results-card">
          <div class="result-row">
            <div class="result-info">
              <span class="result-name">{{ partnerName() }}</span>
              <span class="result-answer">respondió: <strong>{{ partnerOwnAnswer() ?? '...' }}</strong></span>
            </div>
            @if (partnerOwnAnswer()) {
              <span class="result-badge" [class.correct]="isCorrect()" [class.wrong]="!isCorrect()">
                {{ isCorrect() ? '✓' : '✗' }}
              </span>
            } @else {
              <span class="waiting-dot">⌛</span>
            }
          </div>
          @if (partnerOwnAnswer() && !isCorrect()) {
            <p class="guess-detail">Vos dijiste: {{ myGuess() }}</p>
          }
          <div class="divider"></div>
          <div class="result-row">
            <div class="result-info">
              <span class="result-name">Vos</span>
              <span class="result-answer">respondiste: <strong>{{ myOwnAnswer() }}</strong></span>
            </div>
            @if (partnerGuess()) {
              <span class="result-badge" [class.correct]="partnerCorrect()" [class.wrong]="!partnerCorrect()">
                {{ partnerCorrect() ? '✓' : '✗' }}
              </span>
            } @else {
              <span class="waiting-dot">⌛</span>
            }
          </div>
          @if (partnerGuess() && !partnerCorrect()) {
            <p class="guess-detail">{{ partnerName() }} dijo: {{ partnerGuess() }}</p>
          }
          @if (isCorrect() && partnerCorrect()) {
            <div class="both-correct">🎉 ¡Se conocen muy bien!</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .knowledge-section { display: flex; flex-direction: column; gap: 1rem; }

    .knowledge-header {
      display: flex; gap: 0.75rem; align-items: flex-start;
      padding: 1.2rem 1.2rem 0.8rem;
      background: linear-gradient(135deg, #f3e5f5, #fce4ec);
      border-radius: 18px; border-left: 4px solid #9c27b0;
    }
    .knowledge-header > span { font-size: 1.6rem; flex-shrink: 0; }
    .knowledge-header h3 { margin: 0 0 4px; font-size: 0.8rem; font-weight: 700; color: #7b1fa2; text-transform: uppercase; letter-spacing: 1px; }
    .knowledge-header p { margin: 0; font-size: 1rem; font-weight: 500; color: #333; line-height: 1.4; }

    .step-card {
      background: white; border-radius: 16px; padding: 1.2rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.07);
      display: flex; flex-direction: column; gap: 1rem;
    }
    .step-label { margin: 0; font-size: 0.9rem; color: #555; }
    .my-answer-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: #f3e5f5; color: #7b1fa2; font-size: 0.82rem;
      padding: 4px 10px; border-radius: 20px; align-self: flex-start;
    }
    .my-answer-badge span { color: #4caf50; font-weight: 700; }

    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .option-btn {
      padding: 0.75rem 0.5rem; border-radius: 12px;
      border: 2px solid #f0d0e8; background: white;
      font-size: 0.88rem; font-weight: 500; color: #444;
      cursor: pointer; transition: all 0.18s ease; text-align: center;
      &:hover { border-color: #e91e63; background: #fce4ec; color: #c2185b; transform: translateY(-1px); }
      &:active { transform: scale(0.97); }
    }

    .results-card {
      background: white; border-radius: 16px; padding: 1.2rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.07);
      display: flex; flex-direction: column; gap: 0.8rem;
    }
    .result-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .result-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .result-name { font-size: 0.72rem; font-weight: 700; color: #9c27b0; text-transform: uppercase; letter-spacing: 0.5px; }
    .result-answer { font-size: 0.9rem; color: #333; }
    .result-badge {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 700; flex-shrink: 0;
      &.correct { background: #e8f5e9; color: #4caf50; }
      &.wrong   { background: #fce4ec; color: #e91e63; }
    }
    .waiting-dot { font-size: 1.1rem; }
    .guess-detail { margin: 0; font-size: 0.78rem; color: #aaa; }
    .divider { height: 1px; background: #f5f5f5; }
    .both-correct {
      text-align: center; font-size: 0.95rem; font-weight: 600;
      color: #4caf50; padding: 0.5rem;
      background: #e8f5e9; border-radius: 10px;
    }
  `],
})
export class KnowledgeGameComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService  = inject(AuthService);
  private destroyRef   = inject(DestroyRef);

  kQuestion: KnowledgeQuestion | null = null;
  myOwnAnswer      = signal<string | null>(null);
  myGuess          = signal<string | null>(null);
  partnerOwnAnswer = signal<string | null>(null);
  partnerGuess     = signal<string | null>(null);
  partnerName      = signal('tu pareja');

  private coupleId = '';
  private isUser1  = true;

  ngOnInit() {
    this.kQuestion = this.coupleService.getTodayKnowledgeQuestion();

    this.authService.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      switchMap(user => {
        this.coupleId = user!.coupleId!;
        const uid = user!.uid;
        return this.coupleService.getCouple$(this.coupleId).pipe(
          take(1),
          // side-effect: set role and partner name, then start round listener
          (obs) => {
            obs.subscribe(couple => {
              this.isUser1 = couple.user1Uid === uid;
              this.partnerName.set(
                this.isUser1 ? (couple.user2DisplayName ?? 'tu pareja')
                             : (couple.user1DisplayName ?? 'tu pareja')
              );
              this.coupleService.getKnowledgeRound$(this.coupleId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(round => this.applyRound(round));
            });
            return obs;
          }
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  private applyRound(round: KnowledgeRound | null) {
    if (!round) return;
    this.myOwnAnswer.set(this.isUser1 ? round.user1OwnAnswer : round.user2OwnAnswer);
    this.myGuess.set(this.isUser1 ? round.user1Guess : round.user2Guess);
    this.partnerOwnAnswer.set(this.isUser1 ? round.user2OwnAnswer : round.user1OwnAnswer);
    this.partnerGuess.set(this.isUser1 ? round.user2Guess : round.user1Guess);
  }

  async answerOwn(answer: string) {
    if (!this.coupleId) return;
    await this.coupleService.saveKnowledgeOwnAnswer(this.coupleId, this.isUser1, answer);
  }

  async saveGuess(g: string) {
    if (!this.coupleId) return;
    await this.coupleService.saveKnowledgeGuess(this.coupleId, this.isUser1, g);
  }

  isCorrect()      { return !!this.myGuess() && this.myGuess() === this.partnerOwnAnswer(); }
  partnerCorrect() { return !!this.partnerGuess() && this.partnerGuess() === this.myOwnAnswer(); }
}
