// ==========================================
// EXAM MASTER - SERVICE WORKER
// Optimized for Static Asset Caching
// ==========================================

const CACHE_NAME = 'exam-master-v3.1';
const OFFLINE_URL = '/index.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/style.css',
  '/admin.css',
  '/app.js',
  '/admin.js',
  '/manifest.json',
  '/js/utils.js',
  '/js/supabaseClient.js',
  '/js/effects.js',
  '/js/chat.js',
  '/js/notifications.js',
  '/js/exams.js',
  '/js/motivation.js',
  '/js/admin-ui.js',
  '/js/admin-auth.js',
  '/js/admin-exams.js',
  '/js/admin-notifications.js',
  '/js/admin-chat.js',
  '/js/admin-effects.js',
  '/js/admin-dashboard.js',
  
  // External assets
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// ==================== INSTALL EVENT ====================
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;

  // Network-first strategy for API calls (Supabase)
  if (event.request.url.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'You are offline' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }
  
  // Stale-while-revalidate for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Check if valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));
              
            return networkResponse;
          })
          .catch(err => console.log('Network fetch failed, using cache if available', err));

        return cachedResponse || fetchPromise;
      })
  );
});