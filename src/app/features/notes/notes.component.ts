import { Component, DestroyRef, inject, NgZone, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { filter, take, switchMap } from 'rxjs';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Couple, Note } from '../../core/models/couple.model';

const CARD_COLORS = [
  '#ffffff', '#fff9c4', '#fce4ec', '#f3e5f5',
  '#e8f5e9', '#e3f2fd', '#fff3e0', '#fdf6ff',
];

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule],
  template: `
    <div class="notes-page">

      <!-- Inline add panel -->
      @if (adding()) {
        <div class="add-panel" (click)="$event.stopPropagation()">
          <input
            class="add-title"
            [(ngModel)]="newTitle"
            placeholder="Título"
          />
          <textarea
            class="add-body"
            [(ngModel)]="newText"
            placeholder="Escribe una nota..."
            rows="4"
            (keydown.escape)="cancelAdd()"
          ></textarea>
          <div class="add-actions">
            <span class="add-author-hint">
              <mat-icon>person</mat-icon> {{ myDisplayName() }}
            </span>
            <button class="close-btn" (click)="cancelAdd()">Cerrar</button>
            <button class="save-btn" (click)="saveNote()" [disabled]="!newText.trim() && !newTitle.trim()">
              Guardar
            </button>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && notes().length === 0) {
        <div class="empty-state">
          <mat-icon>sticky_note_2</mat-icon>
          <p>Las notas que agreguen aparecerán aquí</p>
        </div>
      }

      <!-- Keep-style grid -->
      @if (!loading() && notes().length > 0) {
        <div class="notes-grid">
          @for (note of notes(); track note.id) {
            <div class="note-card" [style.background]="cardColor(note)" (click)="openNote(note)">
              <button class="card-delete" (click)="$event.stopPropagation(); deleteNote(note)" title="Eliminar">
                <mat-icon>close</mat-icon>
              </button>
              @if (note.title) {
                <p class="card-title">{{ note.title }}</p>
              }
              <p class="card-body">{{ note.text }}</p>
              <div class="card-footer">
                <span class="card-author" [class.mine]="isMyNote(note)">{{ authorName(note) }}</span>
                <span class="card-date">{{ note.createdAt | date:'d MMM' }}</span>
              </div>
            </div>
          }
        </div>
      }

    </div>

    <!-- FAB -->
    <button class="fab" (click)="openAdd()" [class.active]="adding()">
      <mat-icon>{{ adding() ? 'edit' : 'add' }}</mat-icon>
    </button>

    <!-- Backdrop (add panel) -->
    @if (adding()) {
      <div class="backdrop" (click)="cancelAdd()"></div>
    }

    <!-- Expanded note modal -->
    @if (openedNote()) {
      <div class="modal-backdrop" (click)="closeNote()">
        <div class="modal-card" [style.background]="cardColor(openedNote()!)" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="closeNote()">
            <mat-icon>close</mat-icon>
          </button>
          @if (openedNote()!.title) {
            <p class="modal-title">{{ openedNote()!.title }}</p>
          }
          <p class="modal-body">{{ openedNote()!.text }}</p>
          <div class="modal-footer">
            <span class="card-author" [class.mine]="isMyNote(openedNote()!)">
              {{ authorName(openedNote()!) }}
            </span>
            <span class="card-date">{{ openedNote()!.createdAt | date:'d MMM yyyy · HH:mm' }}</span>
          </div>
          <button class="modal-delete" (click)="deleteNote(openedNote()!); closeNote()">
            <mat-icon>delete_outline</mat-icon> Eliminar
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: relative; min-height: 100%; }

    .notes-page {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: 5rem;
    }

    /* ── Add panel ── */
    .add-panel {
      position: relative; z-index: 20;
      background: white; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(233,30,99,0.18);
      border: 1.5px solid #fce4ec;
      margin-bottom: 1.2rem; overflow: hidden;
      animation: slideDown 0.18s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .add-title {
      display: block; width: 100%;
      padding: 0.85rem 1rem 0.4rem;
      border: none; outline: none;
      font-size: 1rem; font-weight: 600; color: #222;
      background: transparent; font-family: inherit; box-sizing: border-box;
      &::placeholder { color: #bbb; font-weight: 400; }
    }
    .add-body {
      display: block; width: 100%;
      padding: 0.4rem 1rem 0.75rem;
      border: none; outline: none; resize: none;
      font-size: 0.92rem; color: #444; line-height: 1.6;
      background: transparent; font-family: inherit; box-sizing: border-box;
      &::placeholder { color: #ccc; }
    }
    .add-actions {
      display: flex; align-items: center;
      padding: 0.5rem 0.75rem; border-top: 1px solid #fce4ec; gap: 0.5rem;
    }
    .add-author-hint {
      flex: 1; display: flex; align-items: center; gap: 4px;
      font-size: 0.75rem; color: #e91e63; font-weight: 600;
      mat-icon { font-size: 0.9rem; height: 0.9rem; width: 0.9rem; }
    }
    .close-btn {
      padding: 0.4rem 0.9rem; border-radius: 8px; border: none;
      background: transparent; color: #888; font-size: 0.85rem;
      cursor: pointer; font-family: inherit;
      &:hover { background: #f5f5f5; }
    }
    .save-btn {
      padding: 0.4rem 1rem; border-radius: 8px; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; font-family: inherit;
      &:disabled { background: #eee; color: #bbb; cursor: default; }
    }

    /* ── Loading skeletons ── */
    .loading-grid {
      columns: 2; column-gap: 0.75rem;
    }
    .skeleton-card {
      break-inside: avoid; border-radius: 14px;
      height: 100px; margin-bottom: 0.75rem;
      background: linear-gradient(90deg, #f5f5f5 25%, #eeeeee 50%, #f5f5f5 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Grid ── */
    .notes-grid { columns: 2; column-gap: 0.75rem; }

    .note-card {
      break-inside: avoid; border-radius: 14px;
      border: 1.5px solid rgba(0,0,0,0.08);
      padding: 0.85rem; margin-bottom: 0.75rem;
      cursor: pointer;
      transition: box-shadow 0.18s ease, transform 0.18s ease;
      &:hover {
        box-shadow: 0 4px 18px rgba(0,0,0,0.13);
        transform: translateY(-2px);
        .card-delete { opacity: 1; }
      }
    }
    .card-delete {
      position: absolute; top: 6px; right: 6px;
      width: 26px; height: 26px; border-radius: 50%;
      border: none; background: transparent;
      color: #aaa; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s, background 0.15s;
      mat-icon { font-size: 0.95rem; height: 0.95rem; width: 0.95rem; }
      &:hover { background: rgba(0,0,0,0.08); color: #555; }
    }
    .note-card { position: relative; }
    .card-title {
      margin: 0 1.4rem 0.4rem 0;
      font-size: 0.9rem; font-weight: 700; color: #222; line-height: 1.4;
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .card-body {
      margin: 0 0 0.6rem;
      font-size: 0.82rem; color: #444; line-height: 1.55;
      white-space: pre-wrap; word-break: break-word;
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 6; -webkit-box-orient: vertical;
    }
    .card-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;
    }
    .card-author {
      font-size: 0.68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.6px; color: #9c27b0;
      &.mine { color: #e91e63; }
    }
    .card-date { font-size: 0.68rem; color: #bbb; }

    /* ── Empty ── */
    .empty-state {
      text-align: center; padding: 4rem 1rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
      mat-icon { font-size: 3rem; height: 3rem; width: 3rem; color: #e0b0c8; }
      p { margin: 0; font-size: 0.9rem; color: #ccc; }
    }

    /* ── FAB ── */
    .fab {
      position: fixed;
      bottom: calc(68px + 1.2rem); right: 1.2rem;
      width: 52px; height: 52px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 18px rgba(233,30,99,0.45);
      transition: transform 0.2s, box-shadow 0.2s; z-index: 30;
      mat-icon { font-size: 1.5rem; height: 1.5rem; width: 1.5rem; }
      &:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(233,30,99,0.55); }
      &.active { transform: rotate(45deg); }
    }

    /* ── Backdrop ── */
    .backdrop { position: fixed; inset: 0; z-index: 10; background: transparent; }

    /* ── Modal ── */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .modal-card {
      width: 100%; max-width: 420px; max-height: 80vh;
      border-radius: 20px; padding: 1.4rem;
      box-shadow: 0 16px 48px rgba(0,0,0,0.22);
      border: 1.5px solid rgba(0,0,0,0.07);
      display: flex; flex-direction: column; gap: 0.75rem;
      overflow-y: auto; position: relative;
      animation: scaleIn 0.18s ease;
    }
    @keyframes scaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    .modal-close {
      position: absolute; top: 10px; right: 10px;
      width: 32px; height: 32px; border-radius: 50%;
      border: none; background: rgba(0,0,0,0.06); color: #666;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.15s;
      mat-icon { font-size: 1.1rem; height: 1.1rem; width: 1.1rem; }
      &:hover { background: rgba(0,0,0,0.12); }
    }
    .modal-title {
      margin: 0 2rem 0 0;
      font-size: 1.1rem; font-weight: 700; color: #1a1a1a; line-height: 1.4;
    }
    .modal-body {
      margin: 0; font-size: 0.95rem; color: #333;
      line-height: 1.7; white-space: pre-wrap; word-break: break-word;
    }
    .modal-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 0.5rem; border-top: 1px solid rgba(0,0,0,0.07);
    }
    .modal-delete {
      display: flex; align-items: center; gap: 4px;
      border: none; background: transparent; color: #e91e63;
      font-size: 0.82rem; font-weight: 600; cursor: pointer;
      padding: 0.4rem 0.6rem; border-radius: 8px; font-family: inherit;
      mat-icon { font-size: 1rem; height: 1rem; width: 1rem; }
      &:hover { background: #fce4ec; }
    }
  `],
})
export class NotesComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService  = inject(AuthService);
  private destroyRef   = inject(DestroyRef);
  private ngZone       = inject(NgZone);

  notes         = signal<Note[]>([]);
  couple        = signal<Couple | null>(null);
  adding        = signal(false);
  loading       = signal(true);
  myDisplayName = signal('Vos');
  openedNote    = signal<Note | null>(null);

  newTitle = '';
  newText  = '';
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
      this.ngZone.run(() => {
        this.couple.set(couple);
        const isUser1 = couple.user1Uid === this.myUid;
        this.myDisplayName.set(isUser1 ? couple.user1DisplayName : (couple.user2DisplayName ?? 'Vos'));
      });

      this.coupleService.getNotes$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(n => this.ngZone.run(() => {
          this.notes.set(n);
          this.loading.set(false);
        }));
    });
  }

  cardColor(note: Note | null): string {
    if (!note) return '#ffffff';
    const idx = parseInt(note.id.slice(-2), 16) % CARD_COLORS.length;
    return CARD_COLORS[idx];
  }

  isMyNote(note: Note)  { return note.authorUid === this.myUid; }

  authorName(note: Note) {
    const c = this.couple();
    if (!c) return '';
    return note.authorUid === this.myUid ? 'Vos' : this.coupleService.getDisplayName(note.authorUid, c);
  }

  openAdd()  { this.adding.set(true); }
  openNote(note: Note)  { this.openedNote.set(note); }
  closeNote() { this.openedNote.set(null); }

  cancelAdd() {
    this.adding.set(false);
    this.newTitle = '';
    this.newText  = '';
  }

  async saveNote() {
    if (!this.newText.trim() && !this.newTitle.trim()) return;
    await this.coupleService.addNote(this.coupleId, this.newTitle.trim(), this.newText.trim());
    this.cancelAdd();
  }

  async deleteNote(note: Note) {
    await this.coupleService.deleteNote(this.coupleId, note.id);
  }
}
