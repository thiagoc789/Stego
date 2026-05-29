import { Injectable, inject, NgZone } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, deleteField } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Couple, DailyAnswer, IntimacyDay, KnowledgeRound, Note, Reminder } from '../models/couple.model';
import { AppUser } from '../models/user.model';
import { AuthService } from './auth.service';
import { DAILY_QUESTIONS } from '../data/questions';
import { KNOWLEDGE_QUESTIONS, KnowledgeQuestion } from '../data/knowledge-questions';

@Injectable({ providedIn: 'root' })
export class CoupleService {
  private firestore = inject(Firestore);
  private auth      = inject(AuthService);
  private ngZone    = inject(NgZone);

  // ── Linking ──────────────────────────────────────────────────────────

  async createCouple(name: string): Promise<string> {
    const uid = this.auth.currentUserUid!;
    const user1DisplayName = await this.getUserDisplayName(uid);
    const inviteCode = this.generateCode();
    const coupleRef = doc(collection(this.firestore, 'couples'));

    const couple: Omit<Couple, 'id'> = {
      name,
      inviteCode,
      user1Uid: uid,
      user1DisplayName,
      user2Uid: null,
      user2DisplayName: null,
      createdAt: new Date(),
    };

    await setDoc(coupleRef, couple);
    await updateDoc(doc(this.firestore, `users/${uid}`), { coupleId: coupleRef.id });
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

    const user2DisplayName = await this.getUserDisplayName(uid);
    await updateDoc(coupleRef, { user2Uid: uid, user2DisplayName });
    await updateDoc(doc(this.firestore, `users/${uid}`), { coupleId });
    return true;
  }

  // ── Couple ───────────────────────────────────────────────────────────

  getCouple$(coupleId: string): Observable<Couple> {
    return new Observable(observer => {
      const ref = doc(this.firestore, `couples/${coupleId}`);
      return onSnapshot(ref, snap => {
        if (snap.exists()) this.ngZone.run(() => observer.next({ id: snap.id, ...snap.data() } as Couple));
      });
    });
  }

  getDisplayName(uid: string, couple: Couple): string {
    if (uid === couple.user1Uid) return couple.user1DisplayName ?? 'Pareja';
    if (uid === couple.user2Uid) return couple.user2DisplayName ?? 'Pareja';
    return 'Desconocido';
  }

  // ── Daily Question ───────────────────────────────────────────────────

  getTodayQuestion(): string {
    return DAILY_QUESTIONS[this.getDayOfYear() % DAILY_QUESTIONS.length];
  }

  getTodayAnswers$(coupleId: string): Observable<DailyAnswer | null> {
    const today = this.todayKey();
    return new Observable(observer => {
      const ref = doc(this.firestore, `couples/${coupleId}/dailyAnswers/${today}`);
      return onSnapshot(ref, snap => {
        this.ngZone.run(() => observer.next(snap.exists() ? (snap.data() as DailyAnswer) : null));
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

  // ── Knowledge Game ───────────────────────────────────────────────────

  getTodayKnowledgeQuestion(): KnowledgeQuestion {
    // Offset by 1 so it doesn't sync with the daily question index
    return KNOWLEDGE_QUESTIONS[(this.getDayOfYear() + 1) % KNOWLEDGE_QUESTIONS.length];
  }

  getKnowledgeRound$(coupleId: string): Observable<KnowledgeRound | null> {
    const today = this.todayKey();
    return new Observable(observer => {
      const ref = doc(this.firestore, `couples/${coupleId}/knowledgeRounds/${today}`);
      return onSnapshot(ref, snap => {
        this.ngZone.run(() => observer.next(snap.exists() ? (snap.data() as KnowledgeRound) : null));
      });
    });
  }

  async saveKnowledgeOwnAnswer(coupleId: string, isUser1: boolean, answer: string): Promise<void> {
    const today = this.todayKey();
    const ref = doc(this.firestore, `couples/${coupleId}/knowledgeRounds/${today}`);
    const field = isUser1 ? 'user1OwnAnswer' : 'user2OwnAnswer';
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, { [field]: answer });
    } else {
      await setDoc(ref, {
        date: today,
        questionId: this.getTodayKnowledgeQuestion().id,
        user1OwnAnswer: isUser1 ? answer : null,
        user1Guess: null,
        user2OwnAnswer: isUser1 ? null : answer,
        user2Guess: null,
      } satisfies KnowledgeRound);
    }
  }

  async saveKnowledgeGuess(coupleId: string, isUser1: boolean, guess: string): Promise<void> {
    const today = this.todayKey();
    const ref = doc(this.firestore, `couples/${coupleId}/knowledgeRounds/${today}`);
    const field = isUser1 ? 'user1Guess' : 'user2Guess';
    await updateDoc(ref, { [field]: guess });
  }

  // ── Notes ────────────────────────────────────────────────────────────

  getNotes$(coupleId: string): Observable<Note[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/notes`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, snap => {
        this.ngZone.run(() => observer.next(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Note)));
      });
    });
  }

  async addNote(coupleId: string, title: string, text: string): Promise<void> {
    const now = new Date();
    await addDoc(collection(this.firestore, `couples/${coupleId}/notes`), {
      title,
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
      const ref = collection(this.firestore, `couples/${coupleId}/reminders`);
      return onSnapshot(ref, snap => {
        this.ngZone.run(() => observer.next(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Reminder)));
      });
    });
  }

  async addReminder(coupleId: string, title: string): Promise<void> {
    await addDoc(collection(this.firestore, `couples/${coupleId}/reminders`), {
      title,
      createdByUid: this.auth.currentUserUid,
      done: false,
      createdAt: new Date(),
    });
  }

  async toggleReminder(coupleId: string, reminderId: string, done: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, `couples/${coupleId}/reminders/${reminderId}`), { done });
  }

  async deleteReminder(coupleId: string, reminderId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `couples/${coupleId}/reminders/${reminderId}`));
  }

  // ── Reactions ────────────────────────────────────────────────────────

  async reactToNote(coupleId: string, noteId: string, uid: string, emoji: string, current: string | undefined): Promise<void> {
    const ref = doc(this.firestore, `couples/${coupleId}/notes/${noteId}`);
    if (current === emoji) {
      await updateDoc(ref, { [`reactions.${uid}`]: deleteField() });
    } else {
      await updateDoc(ref, { [`reactions.${uid}`]: emoji });
    }
  }

  async reactToPhoto(coupleId: string, photoId: string, uid: string, emoji: string, current: string | undefined): Promise<void> {
    const ref = doc(this.firestore, `couples/${coupleId}/photos/${photoId}`);
    if (current === emoji) {
      await updateDoc(ref, { [`reactions.${uid}`]: deleteField() });
    } else {
      await updateDoc(ref, { [`reactions.${uid}`]: emoji });
    }
  }

  // ── Intimacy ─────────────────────────────────────────────────────────

  getIntimacyDays$(coupleId: string): Observable<IntimacyDay[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/intimacy`),
        orderBy('date', 'desc')
      );
      return onSnapshot(q, snap => {
        this.ngZone.run(() => observer.next(snap.docs.map(d => d.data() as IntimacyDay)));
      });
    });
  }

  async toggleIntimacyDay(coupleId: string, date: string, uid: string): Promise<void> {
    await this.addIntimacyMomento(coupleId, date, uid);
  }

  async addIntimacyMomento(coupleId: string, date: string, uid: string): Promise<void> {
    const ref = doc(this.firestore, `couples/${coupleId}/intimacy/${date}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const current = snap.data() as IntimacyDay;
      await updateDoc(ref, { count: (current.count ?? 1) + 1, markedAt: new Date() });
    } else {
      await setDoc(ref, { date, markedByUid: uid, markedAt: new Date(), count: 1 });
    }
  }

  async removeIntimacyMomento(coupleId: string, date: string): Promise<void> {
    const ref = doc(this.firestore, `couples/${coupleId}/intimacy/${date}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const current = snap.data() as IntimacyDay;
    const count = current.count ?? 1;
    if (count <= 1) {
      await deleteDoc(ref);
    } else {
      await updateDoc(ref, { count: count - 1 });
    }
  }

  getQuestionById(id: number): string {
    return DAILY_QUESTIONS[id % DAILY_QUESTIONS.length];
  }

  getKnowledgeQuestionById(id: number): string {
    return KNOWLEDGE_QUESTIONS[id % KNOWLEDGE_QUESTIONS.length].question;
  }

  getDailyHistory$(coupleId: string): Observable<DailyAnswer[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/dailyAnswers`),
        orderBy('date', 'desc')
      );
      return onSnapshot(q, snap => {
        const today = this.todayKey();
        this.ngZone.run(() => observer.next(
          snap.docs
            .map(d => d.data() as DailyAnswer)
            .filter(a => a.date !== today)
        ));
      });
    });
  }

  getKnowledgeHistory$(coupleId: string): Observable<KnowledgeRound[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/knowledgeRounds`),
        orderBy('date', 'desc')
      );
      return onSnapshot(q, snap => {
        const today = this.todayKey();
        this.ngZone.run(() => observer.next(
          snap.docs.map(d => d.data() as KnowledgeRound).filter(r => r.date !== today)
        ));
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async getUserDisplayName(uid: string): Promise<string> {
    const snap = await getDoc(doc(this.firestore, `users/${uid}`));
    return (snap.data() as AppUser)?.displayName ?? 'Usuario';
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // Colombia = UTC-5, no DST. Subtracting 5h from UTC gives a Date whose
  // UTC accessors return Colombia's wall-clock values.
  private getColombiaDate(): Date {
    return new Date(Date.now() - 5 * 3_600_000);
  }

  todayKey(): string {
    return this.getColombiaDate().toISOString().split('T')[0];
  }

  private getDayOfYear(): number {
    const d = this.getColombiaDate();
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
    return Math.floor((d.getTime() - yearStart.getTime()) / 86_400_000);
  }

  static msUntilMidnightColombia(): number {
    // Midnight Colombia = 05:00 UTC of the next Colombia day
    const col = new Date(Date.now() - 5 * 3_600_000);
    const nextMidnight = new Date(Date.UTC(
      col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate() + 1, 5
    ));
    return nextMidnight.getTime() - Date.now();
  }
}
