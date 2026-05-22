import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Note } from '../../core/models/couple.model';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [DatePipe, FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatCardModule],
  template: `
    <div class="notes-container">
      <h2>Notas</h2>

      <div class="add-note">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nueva nota</mat-label>
          <textarea matInput [(ngModel)]="newNoteText" rows="2" placeholder="Escribe algo para los dos..."></textarea>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="addNote()" [disabled]="!newNoteText.trim()">
          <mat-icon>add</mat-icon> Agregar
        </button>
      </div>

      <div class="notes-list">
        @for (note of notes(); track note.id) {
          <mat-card class="note-card">
            <mat-card-content>
              <p class="note-text">{{ note.text }}</p>
              <div class="note-meta">
                <span>{{ note.createdAt | date:'d MMM, HH:mm' }}</span>
                <button mat-icon-button color="warn" (click)="deleteNote(note)">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        } @empty {
          <p class="empty">Sin notas aún. ¡Escribe algo!</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .notes-container { padding: 1.5rem; max-width: 500px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .add-note { display: flex; flex-direction: column; gap: 0.75rem; }
    .full-width { width: 100%; }
    .notes-list { display: flex; flex-direction: column; gap: 1rem; }
    .note-text { font-size: 1rem; white-space: pre-wrap; }
    .note-meta { display: flex; justify-content: space-between; align-items: center; color: #aaa; font-size: 0.8rem; }
    .empty { text-align: center; color: #aaa; font-style: italic; }
  `],
})
export class NotesComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  notes = signal<Note[]>([]);
  newNoteText = '';
  private coupleId = '';

  ngOnInit() {
    this.authService.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(user => {
      this.coupleId = user!.coupleId!;
      this.coupleService.getNotes$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(n => this.notes.set(n));
    });
  }

  async addNote() {
    if (!this.newNoteText.trim() || !this.coupleId) return;
    await this.coupleService.addNote(this.coupleId, this.newNoteText.trim());
    this.newNoteText = '';
  }

  async deleteNote(note: Note) {
    await this.coupleService.deleteNote(this.coupleId, note.id);
  }
}
