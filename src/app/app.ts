import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, of, filter, take } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { CoupleService } from './core/services/couple.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, MatIconModule, MatButtonModule, MatToolbarModule],
  template: `
    @if (auth.currentUser$ | async; as user) {
      @if (user.coupleId) {
        <div class="app-shell">
          <mat-toolbar color="primary" class="app-header">
            <span class="header-heart">♡</span>
            <span class="couple-name">{{ (couple$ | async)?.name || 'Nosotros' }}</span>
            <span class="spacer"></span>
            <button mat-icon-button (click)="auth.logout()" aria-label="Cerrar sesión">
              <mat-icon>logout</mat-icon>
            </button>
          </mat-toolbar>

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
            <a routerLink="/reminders" routerLinkActive="active">
              <mat-icon>alarm</mat-icon>
              <span>Recordatorios</span>
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

    .app-header { flex-shrink: 0; background: #e91e63; color: white; }
    .header-heart { margin-right: 6px; font-size: 1.1rem; }
    .couple-name { font-size: 1.05rem; font-weight: 600; letter-spacing: 0.5px; }
    .spacer { flex: 1; }

    .content { flex: 1; overflow-y: auto; padding-bottom: 80px; }

    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0;
      height: 64px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding-bottom: env(safe-area-inset-bottom);
      z-index: 100;
    }
    .bottom-nav a {
      display: flex; flex-direction: column; align-items: center;
      gap: 2px; text-decoration: none; color: #aaa; font-size: 0.7rem;
      padding: 0.5rem;
    }
    .bottom-nav a.active { color: #e91e63; }
    .bottom-nav a mat-icon { font-size: 1.4rem; }
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
    // Request FCM permission once the user is linked to a couple
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
