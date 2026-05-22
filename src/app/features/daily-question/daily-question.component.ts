import { Component, inject, OnInit, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { DailyAnswer } from '../../core/models/couple.model';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-daily-question',
  standalone: true,
  imports: [AsyncPipe, FormsModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatCardModule],
  template: `
    <div class="daily-container">
      <h2>Pregunta del día</h2>
      <mat-card class="question-card">
        <mat-card-content>
          <p class="question">{{ question }}</p>
        </mat-card-content>
      </mat-card>

      @if (answers$ | async; as answers) {
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
          } @else {
            <p class="waiting">Esperando la respuesta de tu pareja...</p>
          }
        </div>
      }

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

  question = '';
  answerText = '';
  myAnswer = signal<string | null>(null);
  partnerAnswer = signal<string | null>(null);
  answers$: Observable<DailyAnswer | null> = of(null);

  // TODO: get coupleId and isUser1 from user state
  private coupleId = '';
  private isUser1 = true;

  ngOnInit() {
    this.question = this.coupleService.getTodayQuestion();
    // Will wire up coupleId from AuthService/CoupleService once user state is loaded
  }

  async submitAnswer() {
    if (!this.answerText.trim() || !this.coupleId) return;
    const uid = this.authService.currentUserUid!;
    await this.coupleService.saveAnswer(this.coupleId, uid, this.answerText.trim(), this.isUser1);
    this.myAnswer.set(this.answerText.trim());
    this.answerText = '';
  }
}
