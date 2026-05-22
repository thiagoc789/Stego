import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div class="login-bg">
      <div class="bubbles">
        <span>♡</span><span>✦</span><span>♡</span>
        <span>✦</span><span>♡</span><span>✦</span>
      </div>
      <div class="login-card">
        <div class="logo-ring">
          <span class="logo-heart">♡</span>
        </div>
        <h1>Nosotros</h1>
        <p class="subtitle">El espacio de los dos</p>
        <button class="google-btn" (click)="login()">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
          </svg>
          Entrar con Google
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, #fce4ec 0%, #f8bbd0 40%, #e1bee7 100%);
      position: relative;
      overflow: hidden;
    }

    /* Floating decorations */
    .bubbles {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .bubbles span {
      position: absolute;
      font-size: 1.5rem;
      color: rgba(255,255,255,0.5);
      animation: float 6s ease-in-out infinite;
    }
    .bubbles span:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
    .bubbles span:nth-child(2) { top: 20%; right: 20%; animation-delay: 1s; font-size: 0.8rem; }
    .bubbles span:nth-child(3) { top: 60%; left: 8%; animation-delay: 2s; font-size: 2rem; }
    .bubbles span:nth-child(4) { bottom: 25%; right: 12%; animation-delay: 0.5s; }
    .bubbles span:nth-child(5) { bottom: 15%; left: 30%; animation-delay: 1.5s; font-size: 1rem; }
    .bubbles span:nth-child(6) { top: 40%; right: 5%; animation-delay: 3s; font-size: 0.9rem; }
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-18px) rotate(10deg); }
    }

    /* Card */
    .login-card {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(20px);
      border-radius: 28px;
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 20px 60px rgba(194, 24, 91, 0.15);
      width: 280px;
    }

    .logo-ring {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(233, 30, 99, 0.35);
    }
    .logo-heart { font-size: 2.5rem; color: white; line-height: 1; }

    h1 { margin: 0; font-size: 2rem; font-weight: 700; color: #c2185b; }
    .subtitle { margin: 0; color: #aaa; font-size: 0.9rem; }

    .google-btn {
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0.75rem 1.5rem;
      border-radius: 14px;
      border: 1.5px solid #f0d0dc;
      background: white;
      font-size: 0.9rem;
      font-weight: 500;
      color: #444;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);

      &:hover {
        border-color: #e91e63;
        box-shadow: 0 4px 14px rgba(233, 30, 99, 0.15);
        transform: translateY(-1px);
      }
    }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  async login() { await this.auth.loginWithGoogle(); }
}
