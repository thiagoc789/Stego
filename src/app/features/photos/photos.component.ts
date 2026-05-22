import { Component, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { filter, take, switchMap } from 'rxjs';
import { PhotoService } from '../../core/services/photo.service';
import { CoupleService } from '../../core/services/couple.service';
import { AuthService } from '../../core/services/auth.service';
import { Couple, Photo } from '../../core/models/couple.model';

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule],
  template: `
    <div class="page">

      @if (loading()) {
        <div class="grid">
          @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton"></div> }
        </div>
      }

      @if (!loading() && photos().length === 0) {
        <div class="empty">
          <mat-icon>photo_library</mat-icon>
          <p>Sin recuerdos aún</p>
          <span>¡Suban sus momentos especiales!</span>
        </div>
      }

      @if (!loading()) {
        <div class="grid">
          @for (p of photos(); track p.id) {
            <div class="photo-cell" (click)="openPhoto(p)">
              <img [src]="p.url" [alt]="p.caption || 'recuerdo'" loading="lazy" />
              <div class="photo-overlay">
                @if (p.place) {
                  <span class="overlay-place">
                    <mat-icon>place</mat-icon>{{ p.place }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
      }

    </div>

    <!-- FAB -->
    <button class="fab" (click)="fileInput.click()" [disabled]="uploading()">
      @if (uploading()) {
        <span class="upload-pct">{{ uploadProgress() }}%</span>
      } @else {
        <mat-icon>add_a_photo</mat-icon>
      }
    </button>

    <input #fileInput type="file" accept="image/*" style="display:none"
      (change)="onFileSelected($event)" />

    @if (uploading()) {
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" [style.width.%]="uploadProgress()"></div>
      </div>
    }

    <!-- Detail bottom-sheet dialog -->
    @if (captionMode()) {
      <div class="modal-backdrop" (click)="cancelCaption()">
        <div class="detail-dialog" (click)="$event.stopPropagation()">
          <p class="dialog-title">Detalles del recuerdo</p>

          <div class="field">
            <label>Descripción</label>
            <textarea class="field-input" [(ngModel)]="pendingCaption"
              placeholder="¿Qué pasó en esta foto?" rows="2"></textarea>
          </div>

          <div class="field">
            <label>Lugar</label>
            <div class="input-icon-wrap">
              <mat-icon>place</mat-icon>
              <input class="field-input" [(ngModel)]="pendingPlace"
                placeholder="Ciudad, lugar especial..." />
            </div>
          </div>

          <div class="field">
            <label>Fecha del recuerdo</label>
            <div class="input-icon-wrap">
              <mat-icon>calendar_today</mat-icon>
              <input class="field-input" type="date" [(ngModel)]="pendingDate" />
            </div>
          </div>

          <div class="dialog-actions">
            <button class="btn-skip" (click)="cancelCaption()">Cancelar</button>
            <button class="btn-ok" (click)="confirmUpload()">Subir recuerdo</button>
          </div>
        </div>
      </div>
    }

    <!-- Full-screen viewer -->
    @if (openedPhoto()) {
      <div class="viewer-backdrop" (click)="closePhoto()">
        <div class="viewer-card" (click)="$event.stopPropagation()">

          <div class="viewer-header">
            <div class="viewer-meta">
              <span class="viewer-author" [class.mine]="openedPhoto()!.uploaderUid === myUid">
                {{ uploaderName(openedPhoto()!) }}
              </span>
              <span class="viewer-date-sub">Subida {{ openedPhoto()!.createdAt | date:'d MMM yyyy' }}</span>
            </div>
            <div class="viewer-actions">
              @if (openedPhoto()!.uploaderUid === myUid) {
                <button class="viewer-btn danger" (click)="deletePhoto(openedPhoto()!)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              }
              <button class="viewer-btn" (click)="closePhoto()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="viewer-img-wrap">
            <img [src]="openedPhoto()!.url" [alt]="openedPhoto()!.caption" />
          </div>

          @if (openedPhoto()!.caption || openedPhoto()!.place || openedPhoto()!.memoryDate) {
            <div class="viewer-info">
              @if (openedPhoto()!.caption) {
                <p class="viewer-caption">{{ openedPhoto()!.caption }}</p>
              }
              <div class="viewer-tags">
                @if (openedPhoto()!.place) {
                  <span class="viewer-tag">
                    <mat-icon>place</mat-icon>{{ openedPhoto()!.place }}
                  </span>
                }
                @if (openedPhoto()!.memoryDate) {
                  <span class="viewer-tag">
                    <mat-icon>calendar_today</mat-icon>{{ openedPhoto()!.memoryDate | date:'d MMM yyyy' }}
                  </span>
                }
              </div>
            </div>
          }

        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; position: relative; }

    .page { padding: 4px; padding-bottom: 5.5rem; }

    /* ── Grid ── */
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
    .photo-cell {
      position: relative; aspect-ratio: 1; overflow: hidden;
      border-radius: 6px; cursor: pointer; background: #f0f0f0;
      img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.25s ease; }
      &:hover img { transform: scale(1.05); }
      &:hover .photo-overlay { opacity: 1; }
    }
    .photo-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%);
      opacity: 0; transition: opacity 0.2s;
      display: flex; align-items: flex-end; padding: 6px 7px;
    }
    .overlay-place {
      display: flex; align-items: center; gap: 2px;
      font-size: 0.65rem; color: white; font-weight: 600;
      mat-icon { font-size: 0.75rem; height: 0.75rem; width: 0.75rem; }
    }

    /* ── Skeleton ── */
    .skeleton {
      aspect-ratio: 1; border-radius: 6px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
      background-size: 200% 100%; animation: shimmer 1.3s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Empty ── */
    .empty {
      text-align: center; padding: 5rem 1rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
      mat-icon { font-size: 3.5rem; height: 3.5rem; width: 3.5rem; color: #e0b0c8; }
      p { margin: 0; font-size: 1rem; font-weight: 500; color: #bbb; }
      span { font-size: 0.82rem; color: #ccc; }
    }

    /* ── FAB ── */
    .fab {
      position: fixed; bottom: calc(68px + 1rem); right: 1rem;
      width: 52px; height: 52px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 18px rgba(233,30,99,0.45);
      transition: transform 0.2s, opacity 0.2s; z-index: 30;
      mat-icon { font-size: 1.4rem; height: 1.4rem; width: 1.4rem; }
      &:hover:not(:disabled) { transform: scale(1.08); }
      &:disabled { opacity: 0.7; cursor: default; }
    }
    .upload-pct { font-size: 0.75rem; font-weight: 700; }

    /* ── Progress ── */
    .progress-bar-wrap {
      position: fixed; top: 60px; left: 0; right: 0;
      height: 3px; background: #fce4ec; z-index: 50;
    }
    .progress-bar-fill {
      height: 100%; background: linear-gradient(90deg, #e91e63, #9c27b0); transition: width 0.2s;
    }

    /* ── Detail dialog (bottom sheet) ── */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(80,0,40,0.3);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      display: flex; align-items: flex-end; justify-content: center;
    }
    .detail-dialog {
      background: white; border-radius: 24px 24px 0 0;
      padding: 1.4rem 1.4rem 2.2rem;
      width: 100%; max-width: 480px;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
      display: flex; flex-direction: column; gap: 1rem;
      animation: slideUp 0.22s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(60px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    .dialog-title {
      margin: 0; font-size: 1.05rem; font-weight: 700; color: #1a1a1a;
      padding-bottom: 0.5rem; border-bottom: 1.5px solid #fce4ec;
    }
    .field {
      display: flex; flex-direction: column; gap: 0.3rem;
      label { font-size: 0.7rem; font-weight: 700; color: #e91e63; text-transform: uppercase; letter-spacing: 0.5px; }
    }
    .field-input {
      width: 100%; border: 1.5px solid #f0d0dc; border-radius: 12px;
      padding: 0.6rem 0.9rem; font-size: 0.9rem; font-family: inherit;
      outline: none; background: #fffbfc; resize: none; box-sizing: border-box;
      &:focus { border-color: #e91e63; }
      &::placeholder { color: #ccc; }
      &[type="date"] { color: #555; }
    }
    .input-icon-wrap {
      position: relative;
      mat-icon {
        position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
        font-size: 1rem; height: 1rem; width: 1rem; color: #e91e63; pointer-events: none;
      }
      .field-input { padding-left: 2.3rem; }
    }
    .dialog-actions { display: flex; gap: 0.6rem; padding-top: 0.1rem; }
    .btn-skip {
      flex: 1; padding: 0.75rem; border-radius: 14px; border: 1.5px solid #f0d0dc;
      background: transparent; color: #999; font-size: 0.9rem;
      cursor: pointer; font-family: inherit;
      &:hover { background: #fafafa; }
    }
    .btn-ok {
      flex: 2; padding: 0.75rem; border-radius: 14px; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; font-family: inherit;
      box-shadow: 0 3px 12px rgba(233,30,99,0.3);
    }

    /* ── Viewer ── */
    .viewer-backdrop {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(0,0,0,0.92);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .viewer-card {
      width: 100%; max-width: 480px; height: 100%;
      display: flex; flex-direction: column; background: #111;
      animation: scaleIn 0.16s ease;
    }
    @keyframes scaleIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .viewer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 1rem; background: rgba(255,255,255,0.05); flex-shrink: 0;
    }
    .viewer-meta { display: flex; flex-direction: column; gap: 2px; }
    .viewer-author {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      color: rgba(255,255,255,0.6);
      &.mine { color: #f8bbd0; }
    }
    .viewer-date-sub { font-size: 0.68rem; color: rgba(255,255,255,0.35); }
    .viewer-actions { display: flex; gap: 0.3rem; }
    .viewer-btn {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.15s;
      svg { width: 16px; height: 16px; }
      &:hover { background: rgba(255,255,255,0.2); }
      &.danger { color: #f48fb1; background: rgba(233,30,99,0.15); }
      &.danger:hover { background: rgba(233,30,99,0.3); }
    }
    .viewer-img-wrap {
      flex: 1; overflow: hidden; min-height: 0;
      display: flex; align-items: center; justify-content: center; background: #000;
      img { width: 100%; height: 100%; object-fit: contain; }
    }
    .viewer-info {
      flex-shrink: 0; padding: 0.85rem 1rem;
      background: rgba(255,255,255,0.05);
      display: flex; flex-direction: column; gap: 0.5rem;
    }
    .viewer-caption { margin: 0; font-size: 0.9rem; color: rgba(255,255,255,0.85); line-height: 1.5; }
    .viewer-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .viewer-tag {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
      font-size: 0.75rem; padding: 4px 10px; border-radius: 20px;
      mat-icon { font-size: 0.8rem; height: 0.8rem; width: 0.8rem; color: #f48fb1; }
    }
  `],
})
export class PhotosComponent implements OnInit {
  private photoService  = inject(PhotoService);
  private coupleService = inject(CoupleService);
  private authService   = inject(AuthService);
  private destroyRef    = inject(DestroyRef);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  photos         = signal<Photo[]>([]);
  couple         = signal<Couple | null>(null);
  loading        = signal(true);
  uploading      = signal(false);
  uploadProgress = signal(0);
  openedPhoto    = signal<Photo | null>(null);
  captionMode    = signal(false);

  pendingCaption = '';
  pendingPlace   = '';
  pendingDate    = '';

  myUid = '';
  private coupleId = '';
  private pendingFile: File | null = null;

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
      this.photoService.getPhotos$(this.coupleId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(p => {
          this.photos.set(p);
          this.loading.set(false);
        });
    });
  }

  uploaderName(p: Photo) {
    const c = this.couple();
    if (!c) return '';
    return p.uploaderUid === this.myUid ? 'Vos' : this.coupleService.getDisplayName(p.uploaderUid, c);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingFile    = file;
    this.pendingCaption = '';
    this.pendingPlace   = '';
    this.pendingDate    = '';
    this.captionMode.set(true);
    (event.target as HTMLInputElement).value = '';
  }

  cancelCaption() {
    this.captionMode.set(false);
    this.pendingFile = null;
  }

  async confirmUpload() {
    if (!this.pendingFile) return;
    this.captionMode.set(false);
    this.uploading.set(true);
    this.uploadProgress.set(0);
    try {
      await this.photoService.uploadPhoto(
        this.coupleId,
        this.pendingFile,
        this.pendingCaption.trim(),
        this.pendingPlace.trim(),
        this.pendingDate,
        pct => this.uploadProgress.set(pct)
      );
    } finally {
      this.uploading.set(false);
      this.pendingFile = null;
    }
  }

  openPhoto(p: Photo) { this.openedPhoto.set(p); }
  closePhoto()        { this.openedPhoto.set(null); }

  async deletePhoto(p: Photo) {
    this.closePhoto();
    await this.photoService.deletePhoto(this.coupleId, p);
  }
}
