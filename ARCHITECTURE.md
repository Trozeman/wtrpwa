# WeatherPWA — Architecture Reference

## Component Tree

```
<App>
 ├── <SettingsProvider>       — wraps everything, loads wtr_settings
 ├── <LocationProvider>       — loads wtr_location
 ├── <WeatherProvider>        — loads wtr_cache, fires weather:updated event
 │
 ├── [hooks running at root]
 │     useWeatherPoller       — fetches OWM on interval
 │     useGeolocationPoller   — updates GPS coords on interval
 │     useTriggerEngine       — evaluates triggers on weather:updated
 │
 ├── <LocationModal>          — shown when location === null
 │     ├── <CitySearch>       — geocodeCity() → select result
 │     └── <MapPicker>        — Leaflet map → reverseGeocode()
 │
 └── <AppShell>
       ├── <TabBar>           — /weather | /triggers | /settings
       └── <Routes>
             ├── /weather → <WeatherPage>
             │     ├── <CurrentWeather>
             │     ├── <HourlyStrip>
             │     └── <DailyForecast>
             │
             ├── /triggers → <TriggersPage>
             │     ├── <TriggerList>
             │     │     └── <TriggerCard> × N
             │     └── <TriggerEditor>   — modal, create/edit
             │
             └── /settings → <SettingsPage>
```

---

## localStorage Keys

| Key | Shape | Owner |
|-----|-------|-------|
| `wtr_settings` | `{ apiKey, tempUnit, dateFormat, weatherInterval, gpsInterval }` | SettingsContext |
| `wtr_location` | `{ lat, lon, name, country, source, updatedAt }` | LocationContext |
| `wtr_cache` | `{ current, forecast[], fetchedAt }` | WeatherContext |
| `wtr_triggers` | `Trigger[]` | useTriggerEngine |

---

## Service Worker Cache Names

| Cache | Contents | Strategy |
|-------|----------|----------|
| `wtr-precache-v1` | App shell JS/CSS/HTML/images | Cache-first (SW versioned) |
| `wtr-api-v1` | OWM API responses | Network-first, 15 min TTL |
| `wtr-tiles-v1` | OSM map tiles | Stale-while-revalidate |

---

## Trigger Condition Metrics

| `metric` | Data source | Notes |
|----------|-------------|-------|
| `rain_probability` | `forecast[].pop * 100` | Percentage 0–100 |
| `temp_min` | `forecast[].main.temp_min` | Celsius from API |
| `temp_max` | `forecast[].main.temp_max` | Celsius from API |
| `wind_speed` | `forecast[].wind.speed` | m/s from API |
| `humidity` | `forecast[].main.humidity` | Percentage 0–100 |

---

## Template Variables (in notification body)

| Symbol | Expands to |
|--------|-----------|
| `@` | Temperature in user's chosen unit |
| `$` | Wind speed in km/h |
| `%` | Humidity % |
| `&` | Expected event time (formatted per dateFormat setting) |

---

## Notification Permission Flow

```
App mount
  └── check Notification.permission
        ├── "granted"  → engine active, SW ready
        ├── "default"  → show inline prompt button in Settings
        └── "denied"   → show info banner; no notifications
```

Notifications use `ServiceWorkerRegistration.showNotification()` — no server, no push subscription needed for local triggers.

---

## Build Output

```
dist/
├── index.html
├── assets/
│   ├── index.[hash].js      ← React app bundle
│   └── index.[hash].css
├── sw.js                    ← Workbox service worker
├── manifest.webmanifest
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── badge-72.png
```

Any static file server (nginx, Netlify, GitHub Pages) can host this. HTTPS required for SW + Notifications.
