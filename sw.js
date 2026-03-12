/**
 * Service Worker — Портал педагога СКО
 * Офлайн кеш + Push уведомления о чатах
 */
const CACHE_NAME = 'pedagog-v1';
const STATIC = [
  '/', '/index.html', '/auth.html', '/chat.html',
  '/profile.html', '/games.html', '/admin.html',
  '/style.css', '/script.js', '/session.js', '/security.js',
  '/games.css', '/games-patch.css', '/games.js', '/games-patch.js',
  '/manifest.json'
];

// ── Установка: кешируем статику ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Активация: удаляем старые кеши ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network first, fallback to cache ──
self.addEventListener('fetch', e => {
  // Supabase и Telegram — только сеть
  if (e.request.url.includes('supabase.co') || e.request.url.includes('telegram.org')) return;
  // POST запросы — только сеть
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200 && r.type === 'basic') {
          const clone = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});

// ── Push уведомления ──
self.addEventListener('push', e => {
  let data = { title: 'Новое сообщение', body: 'У вас новое сообщение в чате', icon: '/icon-192.png' };
  try { data = { ...data, ...e.data.json() }; } catch(err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/chat.html' },
      actions: [{ action: 'open', title: 'Открыть чат' }]
    })
  );
});

// ── Клик по уведомлению ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/chat.html';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
