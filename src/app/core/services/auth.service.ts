import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, from, switchMap, of, shareReplay } from 'rxjs';
import { AppUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // shareReplay(1): all subscribers share one chain and get the last value immediately.
  // Without this, each component subscription re-runs the full auth→Firestore pipeline,
  // causing a cold-start race where components initialize before the chain emits.
  readonly currentUser$: Observable<AppUser | null> = user(this.auth).pipe(
    switchMap(firebaseUser => {
      if (!firebaseUser) return of(null);
      return from(this.ensureUser(firebaseUser)).pipe(
        switchMap(() =>
          new Observable<AppUser | null>(observer => {
            const ref = doc(this.firestore, `users/${firebaseUser.uid}`);
            return onSnapshot(ref, snap => {
              observer.next(snap.exists() ? (snap.data() as AppUser) : null);
            });
          })
        )
      );
    }),
    shareReplay(1),
  );

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    this.router.navigate(['/']);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  get currentUserUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  private async ensureUser(firebaseUser: any): Promise<void> {
    const ref = doc(this.firestore, `users/${firebaseUser.uid}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? 'Sin nombre',
        email: firebaseUser.email ?? '',
        coupleId: null,
        fcmToken: null,
      } satisfies AppUser);
    }
  }
}
