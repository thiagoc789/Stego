import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, MatIconModule, MatButtonModule],
  template: `
    @if (auth.currentUser$ | async; as user) {
      <div class="app-shell">
        <main class="content">
          <router-outlet />
        </main>
        @if (user.coupleId) {
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
        }
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; height: 100vh; }
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
export class App {
  auth = inject(AuthService);
}
