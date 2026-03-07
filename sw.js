const CACHE_NAME = 'snapchef-v7';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap'
];

let reminderSettings = null;
let reminderTimers = [];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.url.includes('/.netlify/functions/') || 
      request.url.includes('firebase') ||
      request.url.includes('googleapis.com/identitytoolkit')) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(request).then(cached => {
        if (cached) return cached;
        if (request.headers.get('accept').includes('text/html')) return caches.match(OFFLINE_URL);
      });
    })
  );
});

// Notification click - open SnapChef
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        if ('focus' in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// FCM push messages
self.addEventListener('push', event => {
  let data = { title: 'SnapChef', body: 'Check your health goals!' };
  if (event.data) {
    try { data = event.data.json(); } catch(e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'SnapChef', {
      body: data.body || 'Time to check your health goals!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      tag: 'snapchef-push-' + Date.now(),
      data: { url: '/' }
    })
  );
});

// Receive reminder settings from main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_REMINDERS') {
    reminderSettings = event.data.settings;
    startBackgroundReminders(event.data.waterTarget || 8);
  }
});

// Background reminders (work even when app tab is closed)
function startBackgroundReminders(waterTarget) {
  reminderTimers.forEach(t => clearInterval(t));
  reminderTimers = [];
  if (!reminderSettings) return;

  if (reminderSettings.water && reminderSettings.water.enabled) {
    reminderTimers.push(setInterval(() => {
      self.registration.showNotification('Su icme vaxti!', {
        body: 'Hedef: ' + waterTarget + ' stekan. Su icin!',
        icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100], tag: 'snapchef-water', renotify: true
      });
    }, reminderSettings.water.interval * 60 * 1000));
  }

  if (reminderSettings.meals && reminderSettings.meals.enabled) {
    reminderTimers.push(setInterval(() => {
      const now = new Date();
      const ct = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      const times = reminderSettings.meals.times || ['08:00','13:00','19:00'];
      const names = ['Seher yemeyi', 'Gunorta yemeyi', 'Axsam yemeyi'];
      times.forEach((time, i) => {
        if (ct === time) {
          self.registration.showNotification(names[i] + ' vaxti!', {
            body: 'Saglam qidalanmagi unutmayin!',
            icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100], tag: 'snapchef-meal-' + i, renotify: true
          });
        }
      });
    }, 60 * 1000));
  }

  if (reminderSettings.tips && reminderSettings.tips.enabled) {
    const tips = [
      { t: 'Terevez yeyin!', b: 'Her yemeye terevez elave edin.' },
      { t: 'Protein gucu!', b: 'Ezele ucun her yemekde protein olsun.' },
      { t: 'Hereket edin!', b: 'Yemekden sonra 10 deqiqelik gezinti edin.' },
      { t: 'Yaxsi yatin!', b: 'Yaxsi yuxu metabolizm ucun vacibdir.' },
      { t: 'Agilli qelyanalti!', b: 'Meyve, qoz-findiq ve ya yogurt secin.' }
    ];
    reminderTimers.push(setInterval(() => {
      const tip = tips[Math.floor(Math.random() * tips.length)];
      self.registration.showNotification(tip.t, {
        body: tip.b, icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png',
        vibrate: [50, 30, 50], tag: 'snapchef-tip', renotify: true
      });
    }, reminderSettings.tips.interval * 60 * 1000));
  }
}
