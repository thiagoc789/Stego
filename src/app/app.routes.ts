import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'link',
    loadComponent: () => import('./features/auth/link-couple.component').then(m => m.LinkCoupleComponent),
    canActivate: [authGuard],
  },
  {
    path: 'daily',
    loadComponent: () => import('./features/daily-question/daily-question.component').then(m => m.DailyQuestionComponent),
    canActivate: [authGuard],
  },
  {
    path: 'notes',
    loadComponent: () => import('./features/notes/notes.component').then(m => m.NotesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'photos',
    loadComponent: () => import('./features/photos/photos.component').then(m => m.PhotosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'reminders',
    loadComponent: () => import('./features/reminders/reminders.component').then(m => m.RemindersComponent),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'daily', pathMatch: 'full' },
  { path: '**', redirectTo: 'daily' },
];
