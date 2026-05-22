import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <span class="heart">♡</span>
        <h1>Nosotros</h1>
        <p>El espacio de los dos</p>
        <button mat-raised-button color="primary" (click)="login()">
          <mat-icon>login</mat-icon>
          Entrar con Google
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fce4ec, #f8bbd0);
    }
    .login-card {
      text-align: center;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .heart { font-size: 4rem; }
    h1 { font-size: 2.5rem; margin: 0; }
    p { color: #555; margin: 0; }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);

  async login() {
    await this.auth.loginWithGoogle();
  }
}
