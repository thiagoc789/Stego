import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
          <input class="add-title-input" [(ngModel)]="newTitle" placeholder="Título (opcional)" />
          <textarea
            class="add-body-input"
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

      <!-- Loading shimmer -->
      @if (loading()) {
        <div class="notes-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
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

      <!-- Keep-style masonry grid -->
      @if (!loading()) {
        <div class="notes-grid">
          @for (note of notes(); track note.id) {
            <div class="note-card" [style.background]="cardColor(note)" (click)="openNote(note)">
              @if (note.title) {
                <p class="card-title">{{ note.title }}</p>
              }
              <p class="card-body" [class.no-title]="!note.title">{{ note.text }}</p>
              <div class="card-footer">
                <span class="card-author" [class.mine]="isMyNote(note)">{{ authorName(note) }}</span>
                <button class="card-delete" (click)="$event.stopPropagation(); deleteNote(note)" title="Eliminar">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }

    </div>

    <!-- FAB -->
    <button class="fab" (click)="openAdd()" [class.active]="adding()">
      <mat-icon>{{ adding() ? 'close' : 'edit' }}</mat-icon>
    </button>

    <!-- Backdrop (add panel) -->
    @if (adding()) {
      <div class="backdrop" (click)="cancelAdd()"></div>
    }

    <!-- Expanded note modal -->
    @if (openedNote()) {
      <div class="modal-backdrop" (click)="closeNote()">
        <div class="modal-card" [style.background]="cardColor(openedNote()!)" (click)="$event.stopPropagation()">

          <!-- Header: title + action buttons -->
          <div class="modal-header">
            <p class="modal-title">{{ openedNote()!.title || '' }}</p>
            <div class="modal-actions">
              <button class="modal-icon-btn danger" (click)="deleteNote(openedNote()!); closeNote()" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <button class="modal-icon-btn" (click)="closeNote()" title="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <p class="modal-body">{{ openedNote()!.text }}</p>

          <!-- Footer: author + date -->
          <div class="modal-footer">
            <span class="card-author" [class.mine]="isMyNote(openedNote()!)">{{ authorName(openedNote()!) }}</span>
            <span class="modal-date">{{ openedNote()!.createdAt | date:'d MMM yyyy · HH:mm' }}</span>
          </div>
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
      padding-bottom: 6rem;
    }

    /* ── Add panel ── */
    .add-panel {
      position: relative; z-index: 20;
      background: white; border-radius: 16px;
      box-shadow: 0 6px 28px rgba(233,30,99,0.15);
      border: 1.5px solid #fce4ec;
      margin-bottom: 1.2rem; overflow: hidden;
      animation: slideDown 0.18s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .add-title-input {
      display: block; width: 100%;
      padding: 0.85rem 1rem 0.3rem;
      border: none; outline: none;
      font-size: 1rem; font-weight: 600; color: #222;
      background: transparent; font-family: inherit; box-sizing: border-box;
      &::placeholder { color: #ccc; font-weight: 400; }
    }
    .add-body-input {
      display: block; width: 100%;
      padding: 0.3rem 1rem 0.75rem;
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

    /* ── Grid ── */
    .notes-grid {
      columns: 2;
      column-gap: 0.7rem;
    }

    /* ── Skeleton ── */
    .skeleton-card {
      break-inside: avoid; border-radius: 14px;
      height: 110px; margin-bottom: 0.7rem;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.3s infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Note card ── */
    .note-card {
      break-inside: avoid; border-radius: 14px;
      border: 1px solid rgba(0,0,0,0.12);
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      padding: 0.8rem 0.8rem 0.6rem;
      margin-bottom: 0.7rem;
      cursor: pointer;
      transition: box-shadow 0.18s ease, transform 0.15s ease;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.13); transform: translateY(-2px); }
    }
    .card-title {
      margin: 0 0 0.35rem;
      font-size: 0.88rem; font-weight: 700; color: #1a1a1a; line-height: 1.4;
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .card-body {
      margin: 0 0 0.5rem;
      font-size: 0.8rem; color: #444; line-height: 1.55;
      white-space: pre-wrap; word-break: break-word;
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 6; -webkit-box-orient: vertical;
      &.no-title { font-size: 0.85rem; -webkit-line-clamp: 7; }
    }
    .card-footer {
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid rgba(0,0,0,0.06); padding-top: 0.4rem; margin-top: 0.1rem;
    }
    .card-author {
      font-size: 0.65rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px; color: #9c27b0;
      &.mine { color: #e91e63; }
    }
    .card-delete {
      width: 24px; height: 24px; border-radius: 50%;
      border: none; background: transparent; color: #bbb;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; padding: 0;
      transition: background 0.15s, color 0.15s;
      mat-icon { font-size: 1rem; height: 1rem; width: 1rem; }
      &:hover { background: rgba(233,30,99,0.1); color: #e91e63; }
    }

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
      mat-icon { font-size: 1.4rem; height: 1.4rem; width: 1.4rem; }
      &:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(233,30,99,0.55); }
      &.active { background: linear-gradient(135deg, #9c27b0, #e91e63); }
    }

    /* ── Backdrop ── */
    .backdrop { position: fixed; inset: 0; z-index: 10; background: transparent; }

    /* ── Modal ── */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(80,0,40,0.25);
      backdrop-filter: blur(12px) saturate(1.2);
      -webkit-backdrop-filter: blur(12px) saturate(1.2);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.18s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    .modal-card {
      width: 100%; max-width: 420px; max-height: 80vh;
      border-radius: 20px; padding: 0;
      box-shadow: 0 20px 60px rgba(0,0,0,0.28);
      border: 1px solid rgba(0,0,0,0.08);
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: scaleIn 0.16s ease;
    }
    @keyframes scaleIn {
      from { transform: scale(0.93); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 1.1rem 1rem 0.7rem;
      border-bottom: 1px solid rgba(0,0,0,0.07);
    }
    .modal-title {
      flex: 1; margin: 0;
      font-size: 1.05rem; font-weight: 700; color: #1a1a1a;
      line-height: 1.4; min-height: 1.4em;
      word-break: break-word;
    }
    .modal-actions {
      display: flex; gap: 0.3rem; flex-shrink: 0; margin-top: -2px;
    }
    .modal-icon-btn {
      width: 34px; height: 34px; border-radius: 50%; border: none;
      background: rgba(0,0,0,0.06); color: #555;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; transition: background 0.15s, color 0.15s;
      svg { width: 16px; height: 16px; }
      &:hover { background: rgba(0,0,0,0.12); color: #222; }
      &.danger { color: #c62828; background: rgba(198,40,40,0.08); }
      &.danger:hover { background: rgba(198,40,40,0.16); color: #b71c1c; }
    }

    .modal-body {
      flex: 1; overflow-y: auto;
      margin: 0; padding: 0.9rem 1rem;
      font-size: 0.97rem; color: #333; line-height: 1.75;
      white-space: pre-wrap; word-break: break-word;
    }
    .modal-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 1rem 0.8rem;
      border-top: 1px solid rgba(0,0,0,0.07);
    }
    .modal-date { font-size: 0.72rem; color: #aaa; }
  `],
})
export class NotesComponent implements OnInit {
  private coupleService = inject(CoupleService);
  private authService  = inject(AuthService);
  private destroyRef   = inject(DestroyRef);

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
      this.couple.set(couple);
      const isUser1 = couple.user1Uid === this.myUid;
      this.myDisplayName.set(isUser1 ? couple.user1DisplayName : (couple.user2DisplayName ?? 'Vos'));

      this.coupleService.getNotes$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(n => {
          this.notes.set(n);
          this.loading.set(false);
        });
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
  openNote(note: Note) { this.openedNote.set(note); }
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
