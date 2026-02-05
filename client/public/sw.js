const CACHE_NAME = 'mypa-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification event - handles background alarms
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = { title: 'MyPA Alarm', body: 'Time for your alarm!', type: 'alarm' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body || 'Time for your reminder!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'mypa-alarm-' + (data.id || Date.now()),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: '/',
      type: data.type || 'alarm',
      alarmId: data.id,
      textToSpeak: data.textToSpeak
    },
    actions: [
      { action: 'snooze', title: '5 min बाद' },
      { action: 'dismiss', title: 'बंद करो' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'MyPA Alarm', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  
  if (event.action === 'snooze') {
    fetch('/api/push/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alarmId: data.alarmId, minutes: 5 })
    }).catch(console.error);
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/');
        }
      })
    );
  }
});

// Notification close event  
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});
