import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, from, switchMap, of } from 'rxjs';
import { AppUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  readonly currentUser$: Observable<AppUser | null> = user(this.auth).pipe(
    switchMap(firebaseUser => {
      if (!firebaseUser) return of(null);
      return from(this.getOrCreateUser(firebaseUser));
    })
  );

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    await this.getOrCreateUser(credential.user);
    this.router.navigate(['/']);
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  get currentUserUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  private async getOrCreateUser(firebaseUser: any): Promise<AppUser> {
    const ref = doc(this.firestore, `users/${firebaseUser.uid}`);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return snap.data() as AppUser;
    }

    const newUser: AppUser = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName ?? 'Sin nombre',
      email: firebaseUser.email ?? '',
      coupleId: null,
      fcmToken: null,
    };

    await setDoc(ref, newUser);
    return newUser;
  }
}
