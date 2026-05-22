"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAnswerWritten = exports.onReminderCreated = exports.onNoteCreated = void 0;
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
    var _a;
    const note = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!note)
        return;
    const name = await getCoupleName(event.params.coupleId);
    const preview = note['text'].length > 60
        ? note['text'].substring(0, 60) + '…'
        : note['text'];
    await notifyPartner(event.params.coupleId, note['authorUid'], name, `Nueva nota: "${preview}"`);
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
//# sourceMappingURL=index.js.map