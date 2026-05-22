import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { filter, take, switchMap } from 'rxjs';

@Component({
  selector: 'app-daily-question',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatCardModule],
  template: `
    <div class="daily-container">
      <h2>Pregunta del día</h2>
      <mat-card class="question-card">
        <mat-card-content>
          <p class="question">{{ question }}</p>
        </mat-card-content>
      </mat-card>

      <div class="answers">
        @if (myAnswer()) {
          <mat-card class="answer-card mine">
            <mat-card-header><mat-card-title>Tu respuesta</mat-card-title></mat-card-header>
            <mat-card-content><p>{{ myAnswer() }}</p></mat-card-content>
          </mat-card>
        }

        @if (partnerAnswer()) {
          <mat-card class="answer-card partner">
            <mat-card-header><mat-card-title>Su respuesta ♡</mat-card-title></mat-card-header>
            <mat-card-content><p>{{ partnerAnswer() }}</p></mat-card-content>
          </mat-card>
        } @else if (myAnswer()) {
          <p class="waiting">Esperando la respuesta de tu pareja...</p>
        }
      </div>

      @if (!myAnswer()) {
        <div class="input-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Tu respuesta</mat-label>
            <textarea matInput [(ngModel)]="answerText" rows="3" placeholder="Escribe aquí..."></textarea>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="submitAnswer()" [disabled]="!answerText.trim()">
            Enviar respuesta
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .daily-container { padding: 1.5rem; max-width: 500px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .question-card { background: linear-gradient(135deg, #fce4ec, #f8bbd0); }
    .question { font-size: 1.2rem; font-weight: 500; line-height: 1.6; }
    .answers { display: flex; flex-direction: column; gap: 1rem; }
    .answer-card.mine { border-left: 4px solid #e91e63; }
    .answer-card.partner { border-left: 4px solid #9c27b0; }
    .waiting { color: #aaa; text-align: center; font-style: italic; }
    .input-section { display: flex; flex-direction: column; gap: 1rem; }
    .full-width { width: 100%; }
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
