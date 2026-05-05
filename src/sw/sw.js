import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// NASA POWER API — network-first, 20 min cache
registerRoute(
  ({ url }) => url.hostname === 'power.larc.nasa.gov',
  new NetworkFirst({
    cacheName: 'wtr-api-v1',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 20 * 60, maxEntries: 10 }),
    ],
  })
)

// Nominatim geocoding — cache for 1 hour (results rarely change)
registerRoute(
  ({ url }) => url.hostname === 'nominatim.openstreetmap.org',
  new CacheFirst({
    cacheName: 'wtr-nominatim-v1',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60, maxEntries: 30 }),
    ],
  })
)

// Map tiles — stale while revalidate
registerRoute(
  ({ url }) => url.hostname.includes('tile.openstreetmap.org'),
  new StaleWhileRevalidate({ cacheName: 'wtr-tiles-v1' })
)

// IP geolocation fallback
registerRoute(
  ({ url }) => url.hostname === 'ipapi.co',
  new CacheFirst({
    cacheName: 'wtr-geo-v1',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60, maxEntries: 1 }),
    ],
  })
)

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'WeatherPWA', {
      body: data.body ?? '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/badge-72.svg',
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})
