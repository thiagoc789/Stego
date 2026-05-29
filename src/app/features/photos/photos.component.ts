import { Component, DestroyRef, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
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
        <div class="feed">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton-card"></div>
          }
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
        <div class="feed">
          @for (p of photos(); track p.id) {
            <div class="memory-card" (click)="openPhoto(p)">
              <div class="card-img-wrap">
                <img [src]="p.url" [alt]="p.caption || 'recuerdo'" loading="lazy" />
                <span class="card-author-badge" [class.mine]="p.uploaderUid === myUid">
                  {{ uploaderName(p) }}
                </span>
              </div>
              <div class="card-body">
                @if (p.caption) {
                  <p class="card-caption">{{ p.caption }}</p>
                }
                <div class="card-tags">
                  @if (p.memoryDate) {
                    <span class="card-tag date">
                      <mat-icon>calendar_today</mat-icon>
                      {{ p.memoryDate | date:'d MMM yyyy' }}
                    </span>
                  }
                  @if (p.place) {
                    <span class="card-tag place">
                      <mat-icon>place</mat-icon>{{ p.place }}
                    </span>
                  }
                </div>
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

    <!-- Upload dialog (centrado, no bottom sheet) -->
    @if (captionMode()) {
      <div class="overlay" (click)="cancelCaption()">
        <div class="upload-dialog" (click)="$event.stopPropagation()">
          <p class="dialog-title">Nuevo recuerdo</p>

          <div class="field">
            <label>Descripción</label>
            <textarea class="field-input" [(ngModel)]="pendingCaption"
              placeholder="¿Qué pasó en esta foto?" rows="2"></textarea>
          </div>

          <div class="field">
            <label>Lugar</label>
            <div class="icon-field">
              <mat-icon>place</mat-icon>
              <input class="field-input" [(ngModel)]="pendingPlace"
                placeholder="Ciudad, lugar especial..." />
            </div>
          </div>

          <div class="field">
            <label>Fecha del recuerdo</label>
            <div class="icon-field">
              <mat-icon>calendar_today</mat-icon>
              <input class="field-input" type="date" [(ngModel)]="pendingDate" />
            </div>
          </div>

          <div class="dialog-actions">
            <button class="btn-cancel" (click)="cancelCaption()">Cancelar</button>
            <button class="btn-upload" (click)="confirmUpload()">Subir</button>
          </div>
        </div>
      </div>
    }

    <!-- Full-screen viewer -->
    @if (openedPhoto()) {
      <div class="viewer-overlay" (click)="closePhoto()">
        <div class="viewer" (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="viewer-header">
            <span class="viewer-who" [class.mine]="openedPhoto()!.uploaderUid === myUid">
              {{ uploaderName(openedPhoto()!) }}
            </span>
            <div class="viewer-btns">
              @if (openedPhoto()!.uploaderUid === myUid) {
                <button class="vbtn red" (click)="deletePhoto(openedPhoto()!)" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              }
              <button class="vbtn" (click)="closePhoto()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Image -->
          <div class="viewer-img">
            <img [src]="openedPhoto()!.url" [alt]="openedPhoto()!.caption || 'foto'" />
          </div>

          <!-- Info -->
          @if (openedPhoto()!.caption || openedPhoto()!.place || openedPhoto()!.memoryDate) {
            <div class="viewer-info">
              @if (openedPhoto()!.caption) {
                <p class="viewer-caption">{{ openedPhoto()!.caption }}</p>
              }
              <div class="viewer-tags">
                @if (openedPhoto()!.memoryDate) {
                  <span class="vtag">
                    <mat-icon>calendar_today</mat-icon>
                    {{ openedPhoto()!.memoryDate | date:'d MMM yyyy' }}
                  </span>
                }
                @if (openedPhoto()!.place) {
                  <span class="vtag">
                    <mat-icon>place</mat-icon>{{ openedPhoto()!.place }}
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

    .page {
      padding: 0.75rem;
      padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
      max-width: 480px;
      margin: 0 auto;
    }

    /* ── Feed of memory cards ── */
    .feed { display: flex; flex-direction: column; gap: 1rem; }

    .memory-card {
      background: white;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 3px 16px rgba(0,0,0,0.09);
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      &:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.13); }
    }

    .card-img-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 4/3;
      overflow: hidden;
      background: #f0f0f0;
      img {
        width: 100%; height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.25s ease;
      }
      &:hover img { transform: scale(1.03); }
    }

    .card-author-badge {
      position: absolute; top: 10px; left: 10px;
      background: rgba(0,0,0,0.45);
      color: white;
      font-size: 0.68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 3px 9px; border-radius: 20px;
      backdrop-filter: blur(4px);
      &.mine { background: rgba(124,58,237,0.65); }
    }

    .card-body {
      padding: 0.75rem 1rem 0.85rem;
      display: flex; flex-direction: column; gap: 0.4rem;
    }
    .card-caption {
      margin: 0;
      font-size: 0.88rem; color: #333; line-height: 1.5;
      overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .card-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .card-tag {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 0.72rem; font-weight: 600; padding: 3px 9px;
      border-radius: 20px;
      mat-icon { font-size: 0.78rem; height: 0.78rem; width: 0.78rem; }
      &.date { background: #ede9fe; color: #2e1065; mat-icon { color: #6d28d9; } }
      &.place { background: #ede9fe; color: #5b21b6; mat-icon { color: #7c3aed; } }
    }

    /* ── Skeleton ── */
    .skeleton-card {
      border-radius: 18px; height: 280px;
      background: linear-gradient(90deg, #f5f5f5 25%, #eeeeee 50%, #f5f5f5 75%);
      background-size: 200% 100%; animation: shimmer 1.3s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Empty ── */
    .empty {
      text-align: center; padding: 5rem 1rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
      mat-icon { font-size: 3.5rem; height: 3.5rem; width: 3.5rem; color: #c4b5fd; }
      p { margin: 0; font-size: 1rem; font-weight: 500; color: #bbb; }
      span { font-size: 0.82rem; color: #ccc; }
    }

    /* ── FAB ── */
    .fab {
      position: fixed; bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 1rem); right: 1rem;
      width: 52px; height: 52px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white; display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 18px rgba(124,58,237,0.45);
      transition: transform 0.2s, opacity 0.2s; z-index: 30;
      mat-icon { font-size: 1.4rem; height: 1.4rem; width: 1.4rem; }
      &:hover:not(:disabled) { transform: scale(1.08); }
      &:disabled { opacity: 0.7; cursor: default; }
    }
    .upload-pct { font-size: 0.75rem; font-weight: 700; }

    /* ── Progress bar ── */
    .progress-bar-wrap {
      position: fixed; top: 60px; left: 0; right: 0;
      height: 3px; background: #ede9fe; z-index: 50;
    }
    .progress-bar-fill {
      height: 100%; background: linear-gradient(90deg, #7c3aed, #6d28d9); transition: width 0.2s;
    }

    /* ── Upload dialog (centered modal) ── */
    .overlay {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(80,0,40,0.3);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      display: flex; align-items: center; justify-content: center; padding: 1.5rem;
    }
    .upload-dialog {
      background: white; border-radius: 22px;
      padding: 1.4rem; width: 100%; max-width: 400px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.18);
      display: flex; flex-direction: column; gap: 0.9rem;
      animation: popIn 0.2s ease;
    }
    @keyframes popIn {
      from { transform: scale(0.92); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    .dialog-title {
      margin: 0; font-size: 1.05rem; font-weight: 700; color: #1a1a1a;
      padding-bottom: 0.6rem; border-bottom: 1.5px solid #ede9fe;
    }
    .field {
      display: flex; flex-direction: column; gap: 0.3rem;
      label { font-size: 0.7rem; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; }
    }
    .field-input {
      width: 100%; border: 1.5px solid #ddd6fe; border-radius: 12px;
      padding: 0.6rem 0.85rem; font-size: 0.9rem; font-family: inherit;
      outline: none; background: #faf8ff; resize: none; box-sizing: border-box;
      &:focus { border-color: #7c3aed; }
      &::placeholder { color: #ccc; }
      &[type="date"] { color: #555; }
    }
    .icon-field {
      position: relative;
      mat-icon {
        position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%);
        font-size: 1rem; height: 1rem; width: 1rem; color: #7c3aed; pointer-events: none;
      }
      .field-input { padding-left: 2.2rem; }
    }
    .dialog-actions { display: flex; gap: 0.6rem; padding-top: 0.2rem; }
    .btn-cancel {
      flex: 1; padding: 0.7rem; border-radius: 12px; border: 1.5px solid #ddd6fe;
      background: transparent; color: #999; font-size: 0.88rem;
      cursor: pointer; font-family: inherit;
    }
    .btn-upload {
      flex: 2; padding: 0.7rem; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white; font-size: 0.88rem; font-weight: 600;
      cursor: pointer; font-family: inherit;
      box-shadow: 0 3px 12px rgba(124,58,237,0.3);
    }

    /* ── Full-screen viewer ── */
    .viewer-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: rgba(0,0,0,0.88);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .viewer {
      width: 100%; max-width: 480px;
      max-height: calc(100vh - 2rem);
      background: #111; border-radius: 20px;
      overflow: hidden;
      display: flex; flex-direction: column;
      animation: popIn 0.18s ease;
      margin: 1rem;
    }

    .viewer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.85rem 1rem; flex-shrink: 0;
      background: rgba(255,255,255,0.06);
    }
    .viewer-who {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: rgba(255,255,255,0.55);
      &.mine { color: #c4b5fd; }
    }
    .viewer-btns { display: flex; gap: 0.3rem; }
    .vbtn {
      width: 34px; height: 34px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.15s;
      svg { width: 15px; height: 15px; }
      &:hover { background: rgba(255,255,255,0.2); }
      &.red { color: #c4b5fd; background: rgba(124,58,237,0.15); }
      &.red:hover { background: rgba(124,58,237,0.3); }
    }

    .viewer-img {
      width: 100%;
      max-height: 65vh;
      background: #000;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      img {
        max-width: 100%; max-height: 65vh;
        object-fit: contain; display: block;
      }
    }

    .viewer-info {
      padding: 0.85rem 1rem;
      background: rgba(255,255,255,0.05);
      display: flex; flex-direction: column; gap: 0.5rem;
      flex-shrink: 0;
    }
    .viewer-caption { margin: 0; font-size: 0.9rem; color: rgba(255,255,255,0.85); line-height: 1.5; }
    .viewer-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .vtag {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
      font-size: 0.73rem; padding: 4px 10px; border-radius: 20px;
      mat-icon { font-size: 0.78rem; height: 0.78rem; width: 0.78rem; color: #c4b5fd; }
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
        this.coupleId, this.pendingFile,
        this.pendingCaption.trim(), this.pendingPlace.trim(), this.pendingDate,
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
