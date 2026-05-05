# WeatherPWA — Product Specification

## Overview

A Progressive Web App that delivers weather data and customizable push-notification triggers. Works entirely on browser APIs — no backend required. Built with React, persists state in `localStorage`, caches assets and API responses via Service Worker.

---

## 1. Location Resolution

### Priority order

1. **Browser Geolocation API** (`navigator.geolocation.getCurrentPosition`) — requested on first launch.
2. **Manual city search** — type a city name; autocomplete resolves via OpenWeatherMap Geocoding API (`/geo/1.0/direct`).
3. **Map picker** — embedded `<iframe>` or Leaflet.js (bundled, no CDN) with a draggable pin; reverse-geocodes the dropped coordinate via OpenWeatherMap Geocoding API (`/geo/1.0/reverse`).

### Permission flow

```
App opens
  └─ request geolocation
       ├─ granted → store {lat, lon, source: "gps"} → start polling
       └─ denied/unavailable
            └─ show Location Modal
                 ├─ Search tab: city name input → hit Geocoding API → select result
                 └─ Map tab: Leaflet map → drop pin → reverse geocode
                      └─ confirm → store {lat, lon, name, source: "manual"} → start polling
```

### Location storage schema (localStorage key: `wtr_location`)

```json
{
  "lat": 50.4198,
  "lon": 25.7394,
  "name": "Dubno",
  "country": "UA",
  "source": "manual" | "gps",
  "updatedAt": 1714900000000
}
```

---

## 2. Weather Data

### Source

OpenWeatherMap free tier:
- **Current weather**: `GET /data/2.5/weather?lat=&lon=&appid=&units=metric`
- **3-day / hourly forecast**: `GET /data/2.5/forecast?lat=&lon=&appid=&cnt=40&units=metric`
- **Geocoding**: `GET /geo/1.0/direct?q=&limit=5&appid=`
- **Reverse geocoding**: `GET /geo/1.0/reverse?lat=&lon=&limit=1&appid=`

All fetches go through the Service Worker, which caches responses with a network-first, fallback-to-cache strategy.

### Poll intervals

| Source | Default | Configurable range |
|--------|---------|-------------------|
| GPS location | 5 min | 1–60 min |
| Manual/any weather update | 15 min | 5–120 min |

The Service Worker uses `setInterval` inside `self` (SW scope) triggered by a periodic `postMessage` from the main thread, or the **Background Sync API** (`sync` event) if available.

### Cached weather schema (localStorage key: `wtr_cache`)

```json
{
  "current": { /* OWM /weather response */ },
  "forecast": [ /* array of 3h slots from /forecast */ ],
  "fetchedAt": 1714900000000
}
```

---

## 3. Display Pages / Tabs

### Tab 1 — Weather (home)

- Current temperature, feels-like, humidity, wind speed/direction, UV index, pressure.
- Hourly strip: next 24 h.
- Daily summary: next 3 days (min/max, rain probability, icon).
- All values respect temperature unit and date format from Settings.

### Tab 2 — Triggers

List of user-defined notification rules. Each trigger card shows:
- Name, condition summary, enabled toggle.
- Edit / delete buttons.

**Default triggers (pre-loaded, editable):**

| # | Condition | Default message template |
|---|-----------|--------------------------|
| 1 | Rain expected within 30 min | `Rain soon at &! Humidity: %` |
| 2 | Tomorrow min temp ≤ 15 °C | `Cold tomorrow: @ °C. Wind: $ km/h` |
| 3 | Tomorrow max temp ≥ 30 °C | `Hot tomorrow: @ °C. Humidity: %` |

### Tab 3 — Settings

- **API key** — input field (stored in localStorage).
- **Temperature unit** — Celsius / Fahrenheit / Kelvin.
- **Date/time format** — `DD.MM.YYYY HH:mm` / `MM/DD/YYYY hh:mm a` / ISO 8601, configurable with a preview.
- **Weather update interval** — slider 5–120 min (default 15).
- **GPS update interval** — slider 1–60 min (default 5), shown only if location source is GPS.
- **Notification permission** — button to request/revoke.
- **Reset to defaults** — clears all localStorage.

---

## 4. Trigger Engine

### Trigger schema (localStorage key: `wtr_triggers`, array)

```json
{
  "id": "uuid-v4",
  "name": "Rain soon",
  "enabled": true,
  "condition": {
    "metric": "rain_probability" | "temp_min" | "temp_max" | "wind_speed" | "humidity",
    "operator": "gte" | "lte" | "eq",
    "value": 80,
    "window": "next_30min" | "today" | "tomorrow"
  },
  "template": "Rain at &! Temp: @ Humidity: %",
  "lastFiredAt": null
}
```

### Template variables

| Symbol | Replaced with |
|--------|--------------|
| `@` | Temperature (in configured unit) |
| `$` | Wind speed (km/h or m/s) |
| `%` | Humidity (%) |
| `&` | Expected event time (formatted per date setting) |

### Evaluation loop

Triggered after every weather fetch:
1. Load `wtr_triggers` from localStorage.
2. For each enabled trigger, evaluate `condition` against current/forecast data.
3. If condition is met AND `lastFiredAt` is null or > 1 h ago → fire notification.
4. Update `lastFiredAt`.

### Notifications

Uses `Notification` API (Web Push without server; local-only notifications via Service Worker `showNotification`).

```js
self.registration.showNotification(trigger.name, {
  body: resolveTemplate(trigger.template, weatherData),
  icon: '/icons/icon-192.png',
  badge: '/icons/badge-72.png',
});
```

---

## 5. Progressive Web App Requirements

### manifest.json

```json
{
  "name": "WeatherPWA",
  "short_name": "Weather",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker strategy

| Resource type | Strategy |
|--------------|----------|
| App shell (JS/CSS/HTML) | Cache-first, update on new SW version |
| Weather API responses | Network-first, fallback to cache (max-age respected) |
| Map tiles (Leaflet) | Cache-first, stale-while-revalidate |
| Icons / images | Cache-first |

Versioned cache name: `wtr-v1`. On SW `activate`, delete old cache versions.

### Offline behaviour

- App shell always loads from cache.
- Weather panel shows last cached data with a "Last updated: X ago" banner.
- Triggers still evaluate against cached data.

---

## 6. Settings Persistence

All settings are stored in a single localStorage key `wtr_settings`:

```json
{
  "apiKey": "...",
  "tempUnit": "C",
  "dateFormat": "DD.MM.YYYY HH:mm",
  "weatherInterval": 15,
  "gpsInterval": 5
}
```

---

## 7. Data Flow Diagram

```
User opens app
      │
      ▼
Read localStorage (location, settings, cache, triggers)
      │
      ├─ No location → LocationModal (search | map)
      │
      ▼
WeatherPoller (setInterval, weatherInterval setting)
      │
      ├─ Fetch current + forecast via OWM
      ├─ Write to wtr_cache
      ├─ Dispatch "weather:updated" CustomEvent
      │
      ▼
TriggerEngine (runs on each "weather:updated")
      │
      ├─ Evaluate each enabled trigger
      └─ Post notification via SW if condition met
```

---

## 8. Error States

| Error | Handling |
|-------|----------|
| No API key | Prompt on Settings tab, block fetch |
| API quota exceeded (429) | Show toast, back-off 1 h |
| Geolocation denied | Show LocationModal |
| No network | Show cached data + offline banner |
| Notification permission denied | Show inline Settings button |
