import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Reminder } from '../../core/models/couple.model';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [DatePipe, FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCheckboxModule, MatCardModule],
  template: `
    <div class="reminders-container">
      <h2>Recordatorios</h2>

      <div class="add-reminder">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Título</mat-label>
          <input matInput [(ngModel)]="newTitle" placeholder="Aniversario, cita, etc." />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fecha y hora</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="newDatetime" />
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="addReminder()" [disabled]="!newTitle.trim() || !newDatetime">
          <mat-icon>add_alarm</mat-icon> Agregar
        </button>
      </div>

      <div class="reminders-list">
        @for (reminder of reminders(); track reminder.id) {
          <mat-card [class.done]="reminder.done">
            <mat-card-content class="reminder-row">
              <mat-checkbox [checked]="reminder.done" (change)="toggle(reminder)"></mat-checkbox>
              <div class="reminder-info">
                <span class="reminder-title">{{ reminder.title }}</span>
                <span class="reminder-date">{{ reminder.datetime | date:'d MMM yyyy, HH:mm' }}</span>
              </div>
              <button mat-icon-button color="warn" (click)="deleteReminder(reminder)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </mat-card-content>
          </mat-card>
        } @empty {
          <p class="empty">Sin recordatorios. ¡Agrega uno!</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .reminders-container { padding: 1.5rem; max-width: 500px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .add-reminder { display: flex; flex-direction: column; gap: 0.75rem; }
    .full-width { width: 100%; }
    .reminders-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .reminder-row { display: flex; align-items: center; gap: 0.75rem; }
    .reminder-info { flex: 1; display: flex; flex-direction: column; }
    .reminder-title { font-weight: 500; }
    .reminder-date { font-size: 0.8rem; color: #888; }
    mat-card.done { opacity: 0.5; }
    .empty { text-align: center; color: #aaa; font-style: italic; }
  `],
})
export class RemindersComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  reminders = signal<Reminder[]>([]);
  newTitle = '';
  newDatetime = '';
  private coupleId = '';

  ngOnInit() {
    this.authService.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(user => {
      this.coupleId = user!.coupleId!;
      this.coupleService.getReminders$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(r => this.reminders.set(r));
    });
  }

  async addReminder() {
    if (!this.newTitle.trim() || !this.newDatetime || !this.coupleId) return;
    await this.coupleService.addReminder(this.coupleId, this.newTitle.trim(), new Date(this.newDatetime));
    this.newTitle = '';
    this.newDatetime = '';
  }

  async toggle(reminder: Reminder) {
    await this.coupleService.toggleReminder(this.coupleId, reminder.id, !reminder.done);
  }

  async deleteReminder(reminder: Reminder) {
    await this.coupleService.deleteReminder(this.coupleId, reminder.id);
  }
}
