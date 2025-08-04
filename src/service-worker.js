import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Clean up outdated caches
cleanupOutdatedCaches();

// Cache the Google Fonts stylesheets with a stale-while-revalidate strategy
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache the underlying font files with a cache-first strategy for 1 year
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30,
      }),
    ],
  })
);

// Cache images with a cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache API responses with a network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache CSS and JS files with stale-while-revalidate
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// Cache documents (HTML) with network-first strategy
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Handle background sync for analytics
self.addEventListener('sync', (event) => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // Sync queued analytics data when online
  const cache = await caches.open('analytics-queue');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch (error) {
      console.log('Failed to sync analytics:', error);
    }
  }
}

// Cache analytics requests for later sync if offline
registerRoute(
  ({ url }) => url.hostname === 'www.google-analytics.com' || 
               url.hostname === 'analytics.google.com',
  new NetworkFirst({
    cacheName: 'analytics',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24, // 1 day
      }),
    ],
    networkTimeoutSeconds: 4,
  })
);

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_MEASURE') {
    // Store performance measurements
    const { name, value, timestamp } = event.data;
    
    // Send to analytics or store for later processing
    const measurementData = {
      name,
      value,
      timestamp,
      url: event.source?.url || 'unknown'
    };
    
    // Queue for background sync if needed
    if (!navigator.onLine) {
      queuePerformanceData(measurementData);
    } else {
      sendPerformanceData(measurementData);
    }
  }
});

async function queuePerformanceData(data) {
  const cache = await caches.open('performance-queue');
  const request = new Request('/analytics/performance', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(request, new Response(JSON.stringify(data)));
}

async function sendPerformanceData(data) {
  try {
    await fetch('/analytics/performance', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Queue for later if failed
    await queuePerformanceData(data);
  }
}

// Optimize cache storage
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.startsWith('workbox-') && !name.includes(self.__WB_REVISION)
      );
      
      await Promise.all(
        oldCaches.map(name => caches.delete(name))
      );
      
      // Take control of all clients
      await self.clients.claim();
    })()
  );
});

// Preload critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open('critical-resources');
      
      // Preload critical assets
      const criticalAssets = [
        '/critical.css',
        '/fonts/main-font.woff2',
        '/images/hero-background.webp'
      ];
      
      try {
        await cache.addAll(criticalAssets);
      } catch (error) {
        console.log('Failed to cache critical resources:', error);
      }
      
      // Skip waiting to activate immediately
      await self.skipWaiting();
    })()
  );
});

// Handle push notifications for performance alerts
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    if (data.type === 'performance-alert') {
      const options = {
        body: data.message,
        icon: '/icons/performance-alert.png',
        badge: '/icons/badge.png',
        tag: 'performance-alert',
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Report'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };
      
      event.waitUntil(
        self.registration.showNotification('Performance Alert', options)
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/performance-dashboard')
    );
  }
});