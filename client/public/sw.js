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
  
  // NEVER intercept API calls — let the browser handle cookies/auth directly
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  
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
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'mypa-alarm-' + (data.id || Date.now()),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: '/',
      type: data.type || 'alarm',
      alarmId: data.id,
      textToSpeak: data.textToSpeak,
      alarmType: data.alarmType,
      voiceUrl: data.voiceUrl,
      imageUrl: data.imageUrl,
      language: data.language,
      duration: data.duration,
      loop: data.loop,
      photoUrl: data.photoUrl,
      dosage: data.dosage,
      voiceGender: data.voiceGender,
      title: data.title,
      body: data.body
    },
    actions: [
      { action: 'snooze', title: 'Snooze 5 min' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Always show a system notification regardless of app state.
      // This ensures the user sees the alarm even if the tab is backgrounded.
      self.registration.showNotification(data.title || 'MyPA Alarm', options);

      // Also post to open clients so the in-app handler can show the popup.
      // The client-side dedup logic prevents double-trigger.
      clients.forEach((client) => {
        client.postMessage({ type: 'ALARM_TRIGGER', data: data });
      });
    })
  );
});

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
    return;
  }
  
  if (event.action === 'dismiss') {
    console.log('[SW] Alarm dismissed from notification');
    return;
  }
  
  {
    const alarmParams = new URLSearchParams();
    if (data.alarmId) alarmParams.set('alarm_id', String(data.alarmId));
    if (data.type) alarmParams.set('alarm_type', data.type);
    if (data.alarmType) alarmParams.set('alarm_sound_type', data.alarmType);
    if (data.textToSpeak) alarmParams.set('alarm_text', data.textToSpeak);
    if (data.voiceUrl) alarmParams.set('alarm_voice_url', data.voiceUrl);
    if (data.imageUrl) alarmParams.set('alarm_image_url', data.imageUrl);
    if (data.title) alarmParams.set('alarm_title', data.title);
    if (data.body) alarmParams.set('alarm_body', data.body);
    if (data.language) alarmParams.set('alarm_language', data.language);
    if (data.duration) alarmParams.set('alarm_duration', String(data.duration));
    if (data.voiceGender) alarmParams.set('alarm_voice_gender', data.voiceGender);
    if (data.photoUrl) alarmParams.set('alarm_photo_url', data.photoUrl);
    if (data.dosage) alarmParams.set('alarm_dosage', data.dosage);
    
    const targetUrl = '/?' + alarmParams.toString();
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'ALARM_TRIGGER', data: data });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});
