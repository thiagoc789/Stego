import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CoupleService } from '../../core/services/couple.service';

@Component({
  selector: 'app-link-couple',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSnackBarModule],
  template: `
    <div class="link-container">
      <div class="logo">
        <span class="heart">♡</span>
        <h1>Nosotros</h1>
        <p>El espacio de los dos</p>
      </div>

      @if (!generatedCode()) {
        <div class="option">
          <h3>Crear espacio</h3>
          <p class="hint-text">Dale un nombre a su espacio y comparte el código con tu pareja</p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nombre del espacio</mat-label>
            <input matInput [(ngModel)]="spaceName" maxlength="30" placeholder="Ej: Ana & Luis 💕" />
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="create()"
                  [disabled]="loading() || !spaceName.trim()">
            Crear y obtener código
          </button>
        </div>

        <div class="divider">— o —</div>

        <div class="option">
          <h3>Unirme</h3>
          <p class="hint-text">¿Tu pareja ya creó el espacio? Ingresa el código</p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Código de 6 caracteres</mat-label>
            <input matInput [(ngModel)]="inputCode" maxlength="6" placeholder="ABC123"
                   (input)="inputCode = inputCode.toUpperCase()" />
          </mat-form-field>
          <button mat-raised-button color="accent" (click)="join()"
                  [disabled]="loading() || inputCode.length < 6">
            Unirme
          </button>
        </div>
      } @else {
        <div class="code-section">
          <div class="check-icon">✓</div>
          <h3>¡Espacio creado!</h3>
          <p>Comparte este código con tu pareja:</p>
          <div class="code-box">
            <strong>{{ generatedCode() }}</strong>
          </div>
          <p class="hint-text">Tu pareja lo ingresa en la pantalla "Unirme"</p>
          <button mat-raised-button color="primary" (click)="continue()">
            Ir a la app →
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .link-container {
      min-height: 100vh;
      padding: 2rem 1.5rem;
      max-width: 400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .logo { text-align: center; }
    .logo .heart { font-size: 3rem; }
    .logo h1 { margin: 0; font-size: 2rem; }
    .logo p { margin: 0; color: #888; }
    .option { display: flex; flex-direction: column; gap: 0.75rem; }
    .option h3 { margin: 0; color: #e91e63; }
    .hint-text { margin: 0; font-size: 0.85rem; color: #777; }
    .full-width { width: 100%; }
    .divider { text-align: center; color: #ccc; font-size: 0.9rem; }
    .code-section {
      display: flex; flex-direction: column; align-items: center;
      gap: 1rem; text-align: center; padding-top: 1rem;
    }
    .check-icon { font-size: 3rem; color: #4caf50; }
    .code-section h3 { margin: 0; font-size: 1.4rem; }
    .code-box {
      background: linear-gradient(135deg, #fce4ec, #f8bbd0);
      padding: 1.2rem 2rem;
      border-radius: 12px;
      strong { font-size: 2.2rem; letter-spacing: 6px; color: #c2185b; }
    }
  `],
})
export class LinkCoupleComponent {
  private coupleService = inject(CoupleService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  loading = signal(false);
  generatedCode = signal('');
  spaceName = '';
  inputCode = '';

  async create() {
    if (!this.spaceName.trim()) return;
    this.loading.set(true);
    const code = await this.coupleService.createCouple(this.spaceName.trim());
    this.generatedCode.set(code);
    this.loading.set(false);
  }

  continue() {
    this.router.navigate(['/daily']);
  }

  async join() {
    this.loading.set(true);
    const ok = await this.coupleService.joinCouple(this.inputCode);
    this.loading.set(false);

    if (ok) {
      this.router.navigate(['/daily']);
    } else {
      this.snackBar.open('Código inválido o ya usado', 'Ok', { duration: 3000 });
    }
  }
}
