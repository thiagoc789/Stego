import { Injectable, inject } from '@angular/core';
import { Messaging } from '@angular/fire/messaging';
import { getToken, onMessage } from 'firebase/messaging';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private messaging = inject(Messaging);
  private firestore = inject(Firestore);
  private snackBar = inject(MatSnackBar);

  async requestPermission(uid: string): Promise<void> {
    if (!environment.firebase.vapidKey) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(this.messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (token) {
        await updateDoc(doc(this.firestore, `users/${uid}`), { fcmToken: token });
      }
    } catch (err) {
      console.warn('FCM setup skipped:', err);
    }
  }

  // Show a toast when a notification arrives while the app is open
  listenForeground(): void {
    if (!environment.firebase.vapidKey) return;
    onMessage(this.messaging, payload => {
      const body = payload.notification?.body ?? 'Nueva actividad ♡';
      this.snackBar.open(body, '✕', { duration: 5000 });
    });
  }
}
