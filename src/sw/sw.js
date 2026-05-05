import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { fetchWeather }    from '../lib/openMeteo.js'
import { evaluate }        from '../lib/triggerEval.js'
import { resolveTemplate } from '../lib/templateEngine.js'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Open-Meteo — network-first, 10 min cache
registerRoute(
  ({ url }) => url.hostname === 'api.open-meteo.com',
  new NetworkFirst({
    cacheName: 'wtr-api-v1',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 10 * 60, maxEntries: 10 }),
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

// ── Push notifications (server-sent) ─────────────────
self.addEventListener('push', (e) => {
  const data  = e.data?.json() ?? {}
  const scope = self.registration.scope
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Weather Notifier', {
      body:  data.body ?? '',
      icon:  `${scope}icons/pwa-192x192.png`,
      badge: `${scope}icons/badge-72.svg`,
    })
  )
})

// ── Notification click ────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = self.registration.scope
  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        const existing = list.find(c => c.url.startsWith(target))
        return existing ? existing.focus() : clients.openWindow(target)
      })
  )
})

// ── Skip-waiting message (app update banner) ──────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ── Periodic background sync ──────────────────────────
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'weather-check') e.waitUntil(backgroundWeatherCheck())
})

// ── Shared cache helpers (SW can't use localStorage) ──
const SHARED_CACHE = 'wtr-shared-v1'
const CONFIG_KEY   = '/_wtr/config'

async function readConfig() {
  try {
    const cache = await caches.open(SHARED_CACHE)
    const res   = await cache.match(CONFIG_KEY)
    return res ? res.json() : null
  } catch { return null }
}

async function writeConfig(cfg) {
  try {
    const cache = await caches.open(SHARED_CACHE)
    await cache.put(CONFIG_KEY, new Response(JSON.stringify(cfg), {
      headers: { 'Content-Type': 'application/json' },
    }))
  } catch {}
}

// ── Background weather check ──────────────────────────
const COOLDOWN_MS = 60 * 60 * 1000

async function backgroundWeatherCheck() {
  const cfg = await readConfig()
  if (!cfg?.location?.lat || !cfg?.location?.lon) return

  let weather
  try {
    weather = await fetchWeather(cfg.location.lat, cfg.location.lon)
  } catch { return }

  const triggers = cfg.triggers ?? []
  const settings = cfg.settings ?? {}
  const scope    = self.registration.scope
  const now      = Date.now()
  let   dirty    = false

  for (const trigger of triggers) {
    if (!trigger.enabled) continue
    if (trigger.lastFiredAt && now - trigger.lastFiredAt < COOLDOWN_MS) continue
    if (!evaluate(trigger.condition, weather)) continue

    const body  = resolveTemplate(trigger.template, weather, settings)
    const title = trigger.icon ? `${trigger.icon} ${trigger.name}` : trigger.name
    await self.registration.showNotification(title, {
      body,
      icon:     `${scope}icons/pwa-192x192.png`,
      badge:    `${scope}icons/badge-72.svg`,
      tag:      trigger.id,
      renotify: false,
    })
    trigger.lastFiredAt = now
    dirty = true
  }

  // Persist updated cooldown timestamps so the app won't re-fire on next open
  if (dirty) await writeConfig({ ...cfg, triggers })
}
