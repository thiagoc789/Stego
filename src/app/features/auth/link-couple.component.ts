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
      <h2>Conectemos</h2>

      <div class="option">
        <p>Crea el espacio y comparte el código con tu pareja</p>
        <button mat-raised-button color="primary" (click)="create()" [disabled]="loading()">
          Crear espacio y obtener código
        </button>
        @if (generatedCode()) {
          <div class="code-box">
            <p>Tu código:</p>
            <strong>{{ generatedCode() }}</strong>
            <p class="hint">Compártelo con tu pareja</p>
          </div>
        }
      </div>

      <div class="divider">— o —</div>

      <div class="option">
        <p>¿Tu pareja ya creó el espacio? Ingresa el código</p>
        <mat-form-field appearance="outline">
          <mat-label>Código de 6 caracteres</mat-label>
          <input matInput [(ngModel)]="inputCode" maxlength="6" placeholder="ABC123" />
        </mat-form-field>
        <button mat-raised-button color="accent" (click)="join()" [disabled]="loading() || inputCode.length < 6">
          Unirme
        </button>
      </div>
    </div>
  `,
  styles: [`
    .link-container {
      padding: 2rem;
      max-width: 400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .option { display: flex; flex-direction: column; gap: 0.75rem; }
    .code-box { text-align: center; background: #fce4ec; padding: 1rem; border-radius: 8px; }
    .code-box strong { font-size: 2rem; letter-spacing: 4px; }
    .hint { font-size: 0.8rem; color: #888; margin: 0; }
    .divider { text-align: center; color: #aaa; }
  `],
})
export class LinkCoupleComponent {
  private coupleService = inject(CoupleService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  loading = signal(false);
  generatedCode = signal('');
  inputCode = '';

  async create() {
    this.loading.set(true);
    const code = await this.coupleService.createCouple();
    this.generatedCode.set(code);
    this.loading.set(false);
  }

  async join() {
    this.loading.set(true);
    const ok = await this.coupleService.joinCouple(this.inputCode);
    this.loading.set(false);

    if (ok) {
      this.router.navigate(['/']);
    } else {
      this.snackBar.open('Código inválido o ya usado', 'Ok', { duration: 3000 });
    }
  }
}
