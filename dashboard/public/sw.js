// ============================================
// Astra Dashboard Service Worker
// PWA Offline Support & Caching
// ============================================

const CACHE_NAME = 'astra-dashboard-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon.ico',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first - for API calls
  networkFirst: ['/api/'],
  // Cache first - for static assets
  cacheFirst: ['/assets/', '.js', '.css', '.png', '.jpg', '.svg', '.woff2'],
  // Stale while revalidate - for HTML pages
  staleWhileRevalidate: ['/dashboard'],
};

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // Determine cache strategy
  const strategy = getStrategy(url.pathname);

  event.respondWith(
    handleFetch(request, strategy)
  );
});

// Get cache strategy for URL
function getStrategy(pathname) {
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pathname.includes(pattern)) return 'networkFirst';
  }
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pathname.includes(pattern) || pathname.endsWith(pattern)) return 'cacheFirst';
  }
  for (const pattern of CACHE_STRATEGIES.staleWhileRevalidate) {
    if (pathname.startsWith(pattern)) return 'staleWhileRevalidate';
  }
  return 'networkFirst';
}

// Handle fetch with different strategies
async function handleFetch(request, strategy) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return networkFirst(request);
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  
  // Try to parse as JSON, fallback to plain text
  try {
    data = event.data.json();
  } catch (e) {
    // Plain text message (e.g., from DevTools test)
    const text = event.data.text();
    data = {
      title: 'Astra Bot',
      body: text,
      url: '/dashboard',
    };
  }

  const options = {
    body: data.body || data.message || 'New notification',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/android-chrome-96x96.png',
    vibrate: [100, 50, 100],
    image: data.image,
    data: {
      url: data.url || data.data?.url || '/dashboard',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
    tag: data.tag || 'astra-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Astra Bot', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-settings') {
    event.waitUntil(syncSettings());
  }
});

async function syncSettings() {
  // Get pending settings from IndexedDB and sync with server
  console.log('[SW] Syncing settings...');
}

console.log('[SW] Service Worker loaded');
