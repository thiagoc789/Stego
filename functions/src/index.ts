import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();
const db = getFirestore();
const fcm = getMessaging();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getCoupleName(coupleId: string): Promise<string> {
  const snap = await db.doc(`couples/${coupleId}`).get();
  return snap.data()?.name ?? 'Nosotros';
}

async function notifyPartner(
  coupleId: string,
  authorUid: string,
  title: string,
  body: string
): Promise<void> {
  const coupleSnap = await db.doc(`couples/${coupleId}`).get();
  const couple = coupleSnap.data();
  if (!couple) return;

  const partnerUid: string | null =
    couple['user1Uid'] === authorUid ? couple['user2Uid'] : couple['user1Uid'];
  if (!partnerUid) return;

  const partnerSnap = await db.doc(`users/${partnerUid}`).get();
  const fcmToken: string | null = partnerSnap.data()?.['fcmToken'] ?? null;
  if (!fcmToken) return;

  await fcm.send({
    token: fcmToken,
    notification: { title, body },
    webpush: {
      notification: {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
      },
    },
  });
}

// ── Triggers ─────────────────────────────────────────────────────────────────

// Notify when a note is created
export const onNoteCreated = onDocumentCreated(
  'couples/{coupleId}/notes/{noteId}',
  async event => {
    const note = event.data?.data();
    if (!note) return;

    const name = await getCoupleName(event.params.coupleId);
    const title   = note['title'] ? `"${note['title']}"` : '';
    const preview = note['text']?.length > 50
      ? note['text'].substring(0, 50) + '…'
      : (note['text'] ?? '');
    const body = title ? `${title} · ${preview}` : `Nueva nota: "${preview}"`;

    await notifyPartner(
      event.params.coupleId,
      note['authorUid'],
      name,
      body
    );
  }
);

// Notify when a reminder is created
export const onReminderCreated = onDocumentCreated(
  'couples/{coupleId}/reminders/{reminderId}',
  async event => {
    const reminder = event.data?.data();
    if (!reminder) return;

    const name = await getCoupleName(event.params.coupleId);

    await notifyPartner(
      event.params.coupleId,
      reminder['createdByUid'],
      name,
      `Nuevo recordatorio: "${reminder['title']}"`
    );
  }
);

// Notify when the daily answer document is created or updated (new answer filled)
export const onAnswerWritten = onDocumentWritten(
  'couples/{coupleId}/dailyAnswers/{date}',
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;

    const user1JustAnswered = !before?.['answerUser1'] && after['answerUser1'];
    const user2JustAnswered = !before?.['answerUser2'] && after['answerUser2'];
    if (!user1JustAnswered && !user2JustAnswered) return;

    const coupleSnap = await db.doc(`couples/${event.params.coupleId}`).get();
    const couple = coupleSnap.data();
    if (!couple) return;

    const name = couple['name'] ?? 'Nosotros';
    const authorUid: string = user1JustAnswered
      ? couple['user1Uid']
      : couple['user2Uid'];

    await notifyPartner(
      event.params.coupleId,
      authorUid,
      name,
      '¡Tu pareja respondió la pregunta del día! 💕'
    );
  }
);

// Notify when a photo is uploaded
export const onPhotoCreated = onDocumentCreated(
  'couples/{coupleId}/photos/{photoId}',
  async event => {
    const photo = event.data?.data();
    if (!photo) return;

    const name = await getCoupleName(event.params.coupleId);
    const parts: string[] = [];
    if (photo['place']) parts.push(photo['place']);
    if (photo['memoryDate']) parts.push(photo['memoryDate']);
    const detail = parts.length ? ` · ${parts.join(', ')}` : '';

    await notifyPartner(
      event.params.coupleId,
      photo['uploaderUid'],
      name,
      `📸 Nuevo recuerdo${detail}`
    );
  }
);

// Notify when a reminder is marked as done
export const onReminderDone = onDocumentWritten(
  'couples/{coupleId}/reminders/{reminderId}',
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;

    const justCompleted = !before?.['done'] && after['done'] === true;
    if (!justCompleted) return;

    const coupleSnap = await db.doc(`couples/${event.params.coupleId}`).get();
    const couple = coupleSnap.data();
    if (!couple) return;

    // Find who completed it — could be either user, use createdByUid as fallback
    const name = couple['name'] ?? 'Nosotros';
    await notifyPartner(
      event.params.coupleId,
      after['createdByUid'],
      name,
      `✅ Tarea completada: "${after['title']}"`
    );
  }
);

// Notify when a knowledge round answer or guess is saved
export const onKnowledgeWritten = onDocumentWritten(
  'couples/{coupleId}/knowledgeRounds/{date}',
  async event => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;

    const coupleSnap = await db.doc(`couples/${event.params.coupleId}`).get();
    const couple = coupleSnap.data();
    if (!couple) return;

    const name = couple['name'] ?? 'Nosotros';

    const u1AnsweredNow  = !before?.['user1OwnAnswer'] && after['user1OwnAnswer'];
    const u1GuessedNow   = !before?.['user1Guess']     && after['user1Guess'];
    const u2AnsweredNow  = !before?.['user2OwnAnswer'] && after['user2OwnAnswer'];
    const u2GuessedNow   = !before?.['user2Guess']     && after['user2Guess'];

    if (u1AnsweredNow || u1GuessedNow) {
      await notifyPartner(event.params.coupleId, couple['user1Uid'], name,
        u1AnsweredNow
          ? '🧠 Tu pareja respondió el juego de hoy'
          : '🧠 Tu pareja adivinó tu respuesta');
    } else if (u2AnsweredNow || u2GuessedNow) {
      await notifyPartner(event.params.coupleId, couple['user2Uid'], name,
        u2AnsweredNow
          ? '🧠 Tu pareja respondió el juego de hoy'
          : '🧠 Tu pareja adivinó tu respuesta');
    }
  }
);
