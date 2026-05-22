import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, of, filter, take } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { CoupleService } from './core/services/couple.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, MatIconModule, MatButtonModule],
  template: `
    @if (auth.currentUser$ | async; as user) {
      @if (user.coupleId) {
        <div class="app-shell">
          <header class="app-header">
            <div class="header-left">
              <span class="header-heart">♡</span>
              <span class="couple-name">{{ (couple$ | async)?.name || 'Nosotros' }}</span>
            </div>
            <button mat-icon-button class="logout-btn" (click)="auth.logout()" aria-label="Cerrar sesión">
              <mat-icon>logout</mat-icon>
            </button>
          </header>

          <main class="content">
            <router-outlet />
          </main>

          <nav class="bottom-nav">
            <a routerLink="/daily" routerLinkActive="active">
              <mat-icon>favorite</mat-icon>
              <span>Hoy</span>
            </a>
            <a routerLink="/notes" routerLinkActive="active">
              <mat-icon>note</mat-icon>
              <span>Notas</span>
            </a>
            <a routerLink="/photos" routerLinkActive="active">
              <mat-icon>photo_library</mat-icon>
              <span>Recuerdos</span>
            </a>
            <a routerLink="/reminders" routerLinkActive="active">
              <mat-icon>checklist</mat-icon>
              <span>Tareas</span>
            </a>
          </nav>
        </div>
      } @else {
        <router-outlet />
      }
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100vh; }

    .app-header {
      flex-shrink: 0;
      height: 60px;
      padding: 0 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #e91e63 0%, #ad1457 60%, #7b1fa2 100%);
      box-shadow: 0 2px 12px rgba(233, 30, 99, 0.3);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-heart {
      font-size: 1.3rem;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    .couple-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: white;
      letter-spacing: 0.3px;
    }
    .logout-btn { color: rgba(255,255,255,0.8); }

    .content { flex: 1; overflow-y: auto; padding-bottom: 80px; }

    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0;
      height: 64px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(233, 30, 99, 0.12);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding-bottom: env(safe-area-inset-bottom);
      z-index: 100;
    }
    .bottom-nav a {
      display: flex; flex-direction: column; align-items: center;
      gap: 2px; text-decoration: none; color: #bbb; font-size: 0.68rem;
      padding: 0.5rem 1.2rem;
      border-radius: 12px;
      transition: all 0.2s ease;
    }
    .bottom-nav a.active {
      color: #e91e63;
      background: #fce4ec;
    }
    .bottom-nav a mat-icon { font-size: 1.3rem; height: 1.3rem; width: 1.3rem; }
  `],
})
export class App implements OnInit {
  auth = inject(AuthService);
  private coupleService = inject(CoupleService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  couple$ = this.auth.currentUser$.pipe(
    switchMap(user =>
      user?.coupleId ? this.coupleService.getCouple$(user.coupleId) : of(null)
    )
  );

  ngOnInit() {
    this.auth.currentUser$.pipe(
      filter(u => !!u?.coupleId),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(user => {
      this.notificationService.requestPermission(user!.uid);
      this.notificationService.listenForeground();
    });
  }
}
