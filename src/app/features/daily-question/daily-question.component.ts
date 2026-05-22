import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { filter, take, switchMap } from 'rxjs';

@Component({
  selector: 'app-daily-question',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatInputModule, MatFormFieldModule],
  template: `
    <div class="daily-page">

      <!-- Question card -->
      <div class="question-card">
        <span class="question-label">Pregunta del día</span>
        <p class="question-text">{{ question }}</p>
        <div class="question-deco">✦</div>
      </div>

      <!-- Answers -->
      <div class="answers">
        @if (myAnswer()) {
          <div class="answer-card mine">
            <span class="answer-label">Tu respuesta</span>
            <p class="answer-text">{{ myAnswer() }}</p>
          </div>
        }

        @if (partnerAnswer()) {
          <div class="answer-card partner">
            <span class="answer-label">Su respuesta ♡</span>
            <p class="answer-text">{{ partnerAnswer() }}</p>
          </div>
        } @else if (myAnswer()) {
          <div class="waiting-card">
            <span class="waiting-icon">💭</span>
            <p>Esperando la respuesta de tu pareja...</p>
          </div>
        }
      </div>

      <!-- Input -->
      @if (!myAnswer()) {
        <div class="input-section">
          <textarea
            class="answer-input"
            [(ngModel)]="answerText"
            placeholder="¿Qué respondés vos? 💕"
            rows="4"
          ></textarea>
          <button
            class="submit-btn"
            (click)="submitAnswer()"
            [disabled]="!answerText.trim()"
          >
            Enviar respuesta
          </button>
        </div>
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

    /* Question card */
    .question-card {
      background: linear-gradient(135deg, #e91e63 0%, #ad1457 60%, #7b1fa2 100%);
      border-radius: 22px;
      padding: 1.8rem 1.5rem 1.5rem;
      color: white;
      box-shadow: 0 8px 28px rgba(233, 30, 99, 0.3);
      position: relative;
      overflow: hidden;
    }
    .question-card::before {
      content: '♡';
      position: absolute;
      top: -15px;
      right: -10px;
      font-size: 7rem;
      color: rgba(255,255,255,0.07);
      line-height: 1;
    }
    .question-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(255,255,255,0.7);
      display: block;
      margin-bottom: 0.8rem;
    }
    .question-text {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 500;
      line-height: 1.6;
      position: relative;
    }
    .question-deco {
      margin-top: 1rem;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
    }

    /* Answer cards */
    .answers { display: flex; flex-direction: column; gap: 0.9rem; }
    .answer-card {
      border-radius: 18px;
      padding: 1rem 1.2rem;
      box-shadow: 0 3px 12px rgba(0,0,0,0.07);
    }
    .answer-card.mine {
      background: white;
      border-left: 4px solid #e91e63;
    }
    .answer-card.partner {
      background: white;
      border-left: 4px solid #9c27b0;
    }
    .answer-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: block;
      margin-bottom: 0.5rem;
    }
    .mine .answer-label { color: #e91e63; }
    .partner .answer-label { color: #9c27b0; }
    .answer-text { margin: 0; font-size: 0.95rem; line-height: 1.6; color: #333; }

    .waiting-card {
      text-align: center;
      padding: 1.5rem;
      background: white;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      opacity: 0.7;
    }
    .waiting-icon { font-size: 2rem; }
    .waiting-card p { margin: 0; font-size: 0.85rem; color: #aaa; }

    /* Input */
    .input-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .answer-input {
      width: 100%;
      border: 1.5px solid #fce4ec;
      border-radius: 16px;
      padding: 1rem;
      font-size: 0.95rem;
      font-family: inherit;
      line-height: 1.6;
      resize: none;
      outline: none;
      background: white;
      box-sizing: border-box;
      box-shadow: 0 3px 12px rgba(233, 30, 99, 0.07);
      transition: border-color 0.2s;

      &:focus { border-color: #e91e63; }
      &::placeholder { color: #ddd; }
    }
    .submit-btn {
      padding: 0.85rem;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(233, 30, 99, 0.35);
      transition: all 0.2s ease;

      &:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(233, 30, 99, 0.45);
      }
      &:disabled {
        background: #eee;
        color: #bbb;
        box-shadow: none;
        cursor: default;
      }
    }
  `],
})
export class DailyQuestionComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  question = '';
  answerText = '';
  myAnswer = signal<string | null>(null);
  partnerAnswer = signal<string | null>(null);

  private coupleId = '';
  private uid = '';
  private isUser1 = true;

  ngOnInit() {
    this.question = this.coupleService.getTodayQuestion();

    this.authService.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      switchMap(user => {
        this.coupleId = user!.coupleId!;
        this.uid = user!.uid;
        return this.coupleService.getCouple$(this.coupleId).pipe(take(1));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(couple => {
      this.isUser1 = couple.user1Uid === this.uid;
      this.coupleService.getTodayAnswers$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(answers => {
          this.myAnswer.set(answers ? (this.isUser1 ? answers.answerUser1 : answers.answerUser2) : null);
          this.partnerAnswer.set(answers ? (this.isUser1 ? answers.answerUser2 : answers.answerUser1) : null);
        });
    });
  }

  async submitAnswer() {
    if (!this.answerText.trim() || !this.coupleId) return;
    await this.coupleService.saveAnswer(this.coupleId, this.uid, this.answerText.trim(), this.isUser1);
    this.answerText = '';
  }
}
