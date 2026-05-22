import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Couple, Note } from '../../core/models/couple.model';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule],
  template: `
    <div class="notes-page">
      <div class="add-note-card">
        <textarea
          class="note-input"
          [(ngModel)]="newNoteText"
          placeholder="Escribe algo para los dos... 💕"
          rows="3"
        ></textarea>
        <div class="add-note-footer">
          <button class="send-btn" (click)="addNote()" [disabled]="!newNoteText.trim()">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>

      <div class="notes-list">
        @for (note of notes(); track note.id) {
          <div class="note-card" [class.mine]="isMyNote(note)">
            <button class="delete-btn" (click)="deleteNote(note)">×</button>
            <span class="note-author">{{ authorName(note) }}</span>
            <p class="note-text">{{ note.text }}</p>
            <span class="note-time">{{ note.createdAt | date:'d MMM · HH:mm' }}</span>
          </div>
        } @empty {
          <div class="empty-state">
            <span>💌</span>
            <p>Sin notas aún</p>
            <span class="empty-sub">¡Escribe algo bonito para los dos!</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .notes-page { padding: 1.2rem; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.2rem; }

    .add-note-card {
      background: white; border-radius: 18px; padding: 1rem 1rem 0.75rem;
      box-shadow: 0 4px 20px rgba(194,24,91,0.1); border: 1.5px solid #fce4ec;
    }
    .note-input {
      width: 100%; border: none; outline: none; resize: none;
      font-size: 0.95rem; line-height: 1.6; color: #333;
      background: transparent; font-family: inherit; box-sizing: border-box;
      &::placeholder { color: #ccc; }
    }
    .add-note-footer {
      display: flex; justify-content: flex-end;
      padding-top: 0.5rem; border-top: 1px solid #fce4ec; margin-top: 0.5rem;
    }
    .send-btn {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 3px 10px rgba(233,30,99,0.35);
      mat-icon { font-size: 1.1rem; height: 1.1rem; width: 1.1rem; }
      &:disabled { background: #eee; box-shadow: none; cursor: default; color: #bbb; }
      &:not(:disabled):hover { transform: scale(1.08); }
    }

    .notes-list { display: flex; flex-direction: column; gap: 0.9rem; }
    .note-card {
      position: relative; background: white; border-radius: 16px;
      padding: 0.8rem 2.5rem 0.8rem 1.2rem;
      box-shadow: 0 3px 14px rgba(0,0,0,0.06);
      border-left: 4px solid #f48fb1;
      transition: transform 0.15s ease;
      &:hover { transform: translateY(-1px); }
      &.mine { border-left-color: #e91e63; background: linear-gradient(135deg, #fff, #fff9fb); }
    }
    .note-author {
      display: block; font-size: 0.7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;
    }
    .mine .note-author { color: #e91e63; }
    .note-card:not(.mine) .note-author { color: #9c27b0; }
    .note-text { margin: 0 0 0.5rem; font-size: 0.95rem; line-height: 1.6; color: #333; white-space: pre-wrap; word-break: break-word; }
    .note-time { font-size: 0.72rem; color: #bbb; }
    .delete-btn {
      position: absolute; top: 8px; right: 8px;
      width: 26px; height: 26px; border-radius: 50%; border: none;
      background: transparent; color: #ddd; font-size: 1.1rem;
      line-height: 1; cursor: pointer; display: flex; align-items: center;
      justify-content: center; transition: all 0.15s ease; padding: 0;
      &:hover { background: #fce4ec; color: #e91e63; }
    }

    .empty-state {
      text-align: center; padding: 3rem 1rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      font-size: 3rem;
    }
    .empty-state p { margin: 0; font-size: 1rem; font-weight: 500; color: #aaa; }
    .empty-sub { font-size: 0.85rem; color: #ccc; }
  `],
})
export class NotesComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService  = inject(AuthService);
  private destroyRef   = inject(DestroyRef);

  notes  = signal<Note[]>([]);
  couple = signal<Couple | null>(null);
  newNoteText = '';
  private coupleId = '';
  private myUid    = '';

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
    ).subscribe(couple => {
      this.couple.set(couple);
      this.coupleService.getNotes$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(n => this.notes.set(n));
    });
  }

  isMyNote(note: Note)  { return note.authorUid === this.myUid; }
  authorName(note: Note) {
    const c = this.couple();
    if (!c) return '';
    return note.authorUid === this.myUid ? 'Vos' : this.coupleService.getDisplayName(note.authorUid, c);
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
