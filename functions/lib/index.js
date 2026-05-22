"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onKnowledgeWritten = exports.onReminderDone = exports.onPhotoCreated = exports.onAnswerWritten = exports.onReminderCreated = exports.onNoteCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
const fcm = (0, messaging_1.getMessaging)();
// ── Helpers ──────────────────────────────────────────────────────────────────
async function getCoupleName(coupleId) {
    var _a, _b;
    const snap = await db.doc(`couples/${coupleId}`).get();
    return (_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'Nosotros';
}
async function notifyPartner(coupleId, authorUid, title, body) {
    var _a, _b;
    const coupleSnap = await db.doc(`couples/${coupleId}`).get();
    const couple = coupleSnap.data();
    if (!couple)
        return;
    const partnerUid = couple['user1Uid'] === authorUid ? couple['user2Uid'] : couple['user1Uid'];
    if (!partnerUid)
        return;
    const partnerSnap = await db.doc(`users/${partnerUid}`).get();
    const fcmToken = (_b = (_a = partnerSnap.data()) === null || _a === void 0 ? void 0 : _a['fcmToken']) !== null && _b !== void 0 ? _b : null;
    if (!fcmToken)
        return;
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
exports.onNoteCreated = (0, firestore_1.onDocumentCreated)('couples/{coupleId}/notes/{noteId}', async (event) => {
    var _a, _b, _c;
    const note = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!note)
        return;
    const name = await getCoupleName(event.params.coupleId);
    const title = note['title'] ? `"${note['title']}"` : '';
    const preview = ((_b = note['text']) === null || _b === void 0 ? void 0 : _b.length) > 50
        ? note['text'].substring(0, 50) + '…'
        : ((_c = note['text']) !== null && _c !== void 0 ? _c : '');
    const body = title ? `${title} · ${preview}` : `Nueva nota: "${preview}"`;
    await notifyPartner(event.params.coupleId, note['authorUid'], name, body);
});
// Notify when a reminder is created
exports.onReminderCreated = (0, firestore_1.onDocumentCreated)('couples/{coupleId}/reminders/{reminderId}', async (event) => {
    var _a;
    const reminder = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!reminder)
        return;
    const name = await getCoupleName(event.params.coupleId);
    await notifyPartner(event.params.coupleId, reminder['createdByUid'], name, `Nuevo recordatorio: "${reminder['title']}"`);
});
// Notify when the daily answer document is created or updated (new answer filled)
exports.onAnswerWritten = (0, firestore_1.onDocumentWritten)('couples/{coupleId}/dailyAnswers/{date}', async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!after)
        return;
    const user1JustAnswered = !(before === null || before === void 0 ? void 0 : before['answerUser1']) && after['answerUser1'];
    const user2JustAnswered = !(before === null || before === void 0 ? void 0 : before['answerUser2']) && after['answerUser2'];
    if (!user1JustAnswered && !user2JustAnswered)
        return;
    const coupleSnap = await db.doc(`couples/${event.params.coupleId}`).get();
    const couple = coupleSnap.data();
    if (!couple)
        return;
    const name = (_c = couple['name']) !== null && _c !== void 0 ? _c : 'Nosotros';
    const authorUid = user1JustAnswered
        ? couple['user1Uid']
        : couple['user2Uid'];
    await notifyPartner(event.params.coupleId, authorUid, name, '¡Tu pareja respondió la pregunta del día! 💕');
});
// Notify when a photo is uploaded
exports.onPhotoCreated = (0, firestore_1.onDocumentCreated)('couples/{coupleId}/photos/{photoId}', async (event) => {
    var _a;
    const photo = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!photo)
        return;
    const name = await getCoupleName(event.params.coupleId);
    const parts = [];
    if (photo['place'])
        parts.push(photo['place']);
    if (photo['memoryDate'])
        parts.push(photo['memoryDate']);
    const detail = parts.length ? ` · ${parts.join(', ')}` : '';
    await notifyPartner(event.params.coupleId, photo['uploaderUid'], name, `📸 Nuevo recuerdo${detail}`);
});
// Notify when a reminder is marked as done
exports.onReminderDone = (0, firestore_1.onDocumentWritten)('couples/{coupleId}/reminders/{reminderId}', async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!after)
        return;
    const justCompleted = !(before === null || before === void 0 ? void 0 : before['done']) && after['done'] === true;
    if (!justCompleted)
        return;
    const coupleSnap = await db.doc(`couples/${event.params.coupleId}`).get();
    const couple = coupleSnap.data();
    if (!couple)
        return;
    // Find who completed it — could be either user, use createdByUid as fallback
    const name = (_c = couple['name']) !== null && _c !== void 0 ? _c : 'Nosotros';
    await notifyPartner(event.params.coupleId, after['createdByUid'], name, `✅ Tarea completada: "${after['title']}"`);
});
// Notify when a knowledge round answer or guess is saved
exports.onKnowledgeWritten = (0, firestore_1.onDocumentWritten)('couples/{coupleId}/knowledgeRounds/{date}', async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!after)
        return;
    const coupleSnap = await db.doc(`couples/${event.params.coupleId}`).get();
    const couple = coupleSnap.data();
    if (!couple)
        return;
    const name = (_c = couple['name']) !== null && _c !== void 0 ? _c : 'Nosotros';
    const u1AnsweredNow = !(before === null || before === void 0 ? void 0 : before['user1OwnAnswer']) && after['user1OwnAnswer'];
    const u1GuessedNow = !(before === null || before === void 0 ? void 0 : before['user1Guess']) && after['user1Guess'];
    const u2AnsweredNow = !(before === null || before === void 0 ? void 0 : before['user2OwnAnswer']) && after['user2OwnAnswer'];
    const u2GuessedNow = !(before === null || before === void 0 ? void 0 : before['user2Guess']) && after['user2Guess'];
    if (u1AnsweredNow || u1GuessedNow) {
        await notifyPartner(event.params.coupleId, couple['user1Uid'], name, u1AnsweredNow
            ? '🧠 Tu pareja respondió el juego de hoy'
            : '🧠 Tu pareja adivinó tu respuesta');
    }
    else if (u2AnsweredNow || u2GuessedNow) {
        await notifyPartner(event.params.coupleId, couple['user2Uid'], name, u2AnsweredNow
            ? '🧠 Tu pareja respondió el juego de hoy'
            : '🧠 Tu pareja adivinó tu respuesta');
    }
});
//# sourceMappingURL=index.js.map