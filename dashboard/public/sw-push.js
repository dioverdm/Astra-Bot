// ============================================
// ASTRA BOT - Push Notification Service Worker
// ============================================

const CACHE_NAME = 'astra-push-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW Push] Installing service worker');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW Push] Activating service worker');
  event.waitUntil(clients.claim());
});

// Push event - Receive push notification
self.addEventListener('push', (event) => {
  console.log('[SW Push] Push received');

  if (!event.data) {
    console.log('[SW Push] No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || data.message || 'New notification',
      icon: data.icon || '/android-chrome-192x192.png',
      badge: data.badge || '/android-chrome-96x96.png',
      image: data.image,
      vibrate: [100, 50, 100],
      data: {
        url: data.data?.url || data.url || '/',
        notificationId: data.notificationId,
        timestamp: Date.now(),
      },
      actions: data.actions || [
        { action: 'open', title: 'Open', icon: '/icons/open.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
      ],
      tag: data.tag || 'astra-notification',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      timestamp: data.timestamp || Date.now(),
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Astra Bot', options)
    );
  } catch (error) {
    console.error('[SW Push] Error parsing push data:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Astra Bot', {
        body: event.data.text() || 'New notification',
        icon: '/android-chrome-192x192.png',
        badge: '/android-chrome-96x96.png',
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open URL from notification data
  const urlToOpen = event.notification.data?.url || '/dashboard';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            if (client.url !== fullUrl) {
              client.navigate(fullUrl);
            }
            return;
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notification closed');
  
  // Optional: Track dismissed notifications
  const notificationId = event.notification.data?.notificationId;
  if (notificationId) {
    // Could send analytics or mark as dismissed
  }
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW Push] Subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY,
    })
    .then((subscription) => {
      // Send new subscription to server
      return fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
        credentials: 'include',
      });
    })
    .catch((error) => {
      console.error('[SW Push] Failed to resubscribe:', error);
    })
  );
});

// Message event - Communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW Push] Message received:', event.data);

  if (event.data.type === 'SET_VAPID_KEY') {
    self.VAPID_PUBLIC_KEY = event.data.publicKey;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
