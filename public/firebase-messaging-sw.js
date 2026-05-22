importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAZnk5qeNufOhnvvEyKRB077RKAHcCV5d8',
  authDomain: 'stego-cd22b.firebaseapp.com',
  projectId: 'stego-cd22b',
  storageBucket: 'stego-cd22b.firebasestorage.app',
  messagingSenderId: '862901970284',
  appId: '1:862901970284:web:b9c2c0da5d3099236dbf49',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title ?? 'Nosotros ♡';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  });
});
