import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Couple, DailyAnswer, Note, Reminder } from '../models/couple.model';
import { AuthService } from './auth.service';
import { DAILY_QUESTIONS } from '../data/questions';

@Injectable({ providedIn: 'root' })
export class CoupleService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  // ── Linking ──────────────────────────────────────────────────────────

  async createCouple(): Promise<string> {
    const uid = this.auth.currentUserUid!;
    const inviteCode = this.generateCode();
    const coupleRef = doc(collection(this.firestore, 'couples'));

    const couple: Omit<Couple, 'id'> = {
      inviteCode,
      user1Uid: uid,
      user2Uid: null,
      createdAt: new Date(),
    };

    await setDoc(coupleRef, couple);
    await updateDoc(doc(this.firestore, `users/${uid}`), { coupleId: coupleRef.id });
    // Register invite code for fast lookup when partner joins
    await setDoc(doc(this.firestore, 'meta/inviteCodes'), { [inviteCode]: coupleRef.id }, { merge: true });
    return inviteCode;
  }

  async joinCouple(code: string): Promise<boolean> {
    const uid = this.auth.currentUserUid!;
    const codesDoc = await getDoc(doc(this.firestore, 'meta/inviteCodes'));
    const codes = codesDoc.exists() ? (codesDoc.data() as Record<string, string>) : {};
    const coupleId = codes[code.toUpperCase()];

    if (!coupleId) return false;

    const coupleRef = doc(this.firestore, `couples/${coupleId}`);
    const coupleSnap = await getDoc(coupleRef);
    if (!coupleSnap.exists()) return false;

    const couple = coupleSnap.data() as Couple;
    if (couple.user2Uid && couple.user2Uid !== uid) return false;
    if (couple.user1Uid === uid) return false;

    await updateDoc(coupleRef, { user2Uid: uid });
    await updateDoc(doc(this.firestore, `users/${uid}`), { coupleId });
    return true;
  }

  // ── Couple ───────────────────────────────────────────────────────────

  getCouple$(coupleId: string): Observable<Couple> {
    return new Observable(observer => {
      const ref = doc(this.firestore, `couples/${coupleId}`);
      return onSnapshot(ref, snap => {
        if (snap.exists()) observer.next({ id: snap.id, ...snap.data() } as Couple);
      });
    });
  }

  // ── Daily Question ───────────────────────────────────────────────────

  getTodayQuestion(): string {
    const dayOfYear = this.getDayOfYear();
    return DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];
  }

  getTodayAnswers$(coupleId: string): Observable<DailyAnswer | null> {
    const today = this.todayKey();
    return new Observable(observer => {
      const ref = doc(this.firestore, `couples/${coupleId}/dailyAnswers/${today}`);
      return onSnapshot(ref, snap => {
        observer.next(snap.exists() ? (snap.data() as DailyAnswer) : null);
      });
    });
  }

  async saveAnswer(coupleId: string, uid: string, answer: string, isUser1: boolean): Promise<void> {
    const today = this.todayKey();
    const ref = doc(this.firestore, `couples/${coupleId}/dailyAnswers/${today}`);
    const field = isUser1 ? 'answerUser1' : 'answerUser2';
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, { [field]: answer });
    } else {
      await setDoc(ref, {
        date: today,
        questionId: this.getDayOfYear() % DAILY_QUESTIONS.length,
        answerUser1: isUser1 ? answer : null,
        answerUser2: isUser1 ? null : answer,
      } satisfies DailyAnswer);
    }
  }

  // ── Notes ────────────────────────────────────────────────────────────

  getNotes$(coupleId: string): Observable<Note[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/notes`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, snap => {
        observer.next(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Note));
      });
    });
  }

  async addNote(coupleId: string, text: string): Promise<void> {
    const now = new Date();
    await addDoc(collection(this.firestore, `couples/${coupleId}/notes`), {
      text,
      authorUid: this.auth.currentUserUid,
      createdAt: now,
      updatedAt: now,
    });
  }

  async deleteNote(coupleId: string, noteId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `couples/${coupleId}/notes/${noteId}`));
  }

  // ── Reminders ────────────────────────────────────────────────────────

  getReminders$(coupleId: string): Observable<Reminder[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/reminders`),
        orderBy('datetime', 'asc')
      );
      return onSnapshot(q, snap => {
        observer.next(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Reminder));
      });
    });
  }

  async addReminder(coupleId: string, title: string, datetime: Date): Promise<void> {
    await addDoc(collection(this.firestore, `couples/${coupleId}/reminders`), {
      title,
      datetime,
      createdByUid: this.auth.currentUserUid,
      done: false,
    });
  }

  async toggleReminder(coupleId: string, reminderId: string, done: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, `couples/${coupleId}/reminders/${reminderId}`), { done });
  }

  async deleteReminder(coupleId: string, reminderId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `couples/${coupleId}/reminders/${reminderId}`));
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private todayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
  }
}
