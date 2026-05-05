# WeatherPWA — Implementation Plan

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React 18 (Vite) | Component model, fast HMR |
| Routing | React Router v6 | Tab navigation |
| Map | Leaflet 1.x (bundled via npm) | No CDN, fully cacheable |
| State | React Context + localStorage | No Redux needed |
| Styling | CSS Modules | No external CSS framework |
| SW bundler | Vite PWA plugin (`vite-plugin-pwa`) | Generates SW + manifest automatically |
| Build | Vite | ESM, tree-shaking, small output |

No UI component libraries. No analytics. No tracking.

---

## Step-by-Step Implementation

### Step 1 — Scaffold the project

```bash
npm create vite@latest wtrpwa -- --template react
cd wtrpwa
npm install react-router-dom leaflet
npm install -D vite-plugin-pwa workbox-window
```

Directory structure:

```
wtrpwa/
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── badge-72.png
│   └── offline.html
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TabBar.jsx
│   │   │   └── AppShell.jsx
│   │   ├── weather/
│   │   │   ├── CurrentWeather.jsx
│   │   │   ├── HourlyStrip.jsx
│   │   │   └── DailyForecast.jsx
│   │   ├── location/
│   │   │   ├── LocationModal.jsx
│   │   │   ├── CitySearch.jsx
│   │   │   └── MapPicker.jsx
│   │   ├── triggers/
│   │   │   ├── TriggerList.jsx
│   │   │   ├── TriggerCard.jsx
│   │   │   └── TriggerEditor.jsx
│   │   └── settings/
│   │       └── SettingsPage.jsx
│   ├── context/
│   │   ├── SettingsContext.jsx
│   │   ├── LocationContext.jsx
│   │   └── WeatherContext.jsx
│   ├── hooks/
│   │   ├── useGeolocation.js
│   │   ├── useWeatherPoller.js
│   │   └── useTriggerEngine.js
│   ├── lib/
│   │   ├── api.js           # OWM fetch wrappers
│   │   ├── storage.js       # localStorage helpers
│   │   ├── format.js        # temp/date formatting
│   │   └── templateEngine.js # @, $, %, & resolution
│   ├── sw/
│   │   └── sw.js            # custom SW logic (notifications, bg sync)
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js
└── package.json
```

---

### Step 2 — Vite + PWA config

**`vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.js',
      manifest: {
        name: 'WeatherPWA',
        short_name: 'Weather',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#3b82f6',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
});
```

---

### Step 3 — localStorage helpers (`src/lib/storage.js`)

```js
const KEYS = {
  SETTINGS: 'wtr_settings',
  LOCATION: 'wtr_location',
  CACHE:    'wtr_cache',
  TRIGGERS: 'wtr_triggers',
};

const DEFAULTS = {
  settings: {
    apiKey: '',
    tempUnit: 'C',          // 'C' | 'F' | 'K'
    dateFormat: 'DD.MM.YYYY HH:mm',
    weatherInterval: 15,    // minutes
    gpsInterval: 5,
  },
  triggers: [
    {
      id: 'default-rain',
      name: 'Rain soon',
      enabled: true,
      condition: { metric: 'rain_probability', operator: 'gte', value: 80, window: 'next_30min' },
      template: 'Rain expected at &! Humidity: %',
      lastFiredAt: null,
    },
    {
      id: 'default-cold',
      name: 'Cold tomorrow',
      enabled: true,
      condition: { metric: 'temp_min', operator: 'lte', value: 15, window: 'tomorrow' },
      template: 'Cold tomorrow: @ °. Wind: $ km/h',
      lastFiredAt: null,
    },
    {
      id: 'default-hot',
      name: 'Hot tomorrow',
      enabled: true,
      condition: { metric: 'temp_max', operator: 'gte', value: 30, window: 'tomorrow' },
      template: 'Hot tomorrow: @°. Humidity: %',
      lastFiredAt: null,
    },
  ],
};

export function load(key) {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function save(key, data) {
  localStorage.setItem(KEYS[key], JSON.stringify(data));
}

export function loadSettings() {
  return { ...DEFAULTS.settings, ...(load('SETTINGS') ?? {}) };
}

export function loadTriggers() {
  return load('TRIGGERS') ?? DEFAULTS.triggers;
}
```

---

### Step 4 — OWM API wrappers (`src/lib/api.js`)

```js
const BASE = 'https://api.openweathermap.org';

async function owm(path, params) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OWM ${res.status}`);
  return res.json();
}

export const fetchCurrent = (lat, lon, apiKey) =>
  owm('/data/2.5/weather', { lat, lon, appid: apiKey, units: 'metric' });

export const fetchForecast = (lat, lon, apiKey) =>
  owm('/data/2.5/forecast', { lat, lon, appid: apiKey, units: 'metric', cnt: 40 });

export const geocodeCity = (q, apiKey) =>
  owm('/geo/1.0/direct', { q, limit: 5, appid: apiKey });

export const reverseGeocode = (lat, lon, apiKey) =>
  owm('/geo/1.0/reverse', { lat, lon, limit: 1, appid: apiKey });
```

---

### Step 5 — Context providers

#### `SettingsContext.jsx`

```jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { loadSettings, save } from '../lib/storage';

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save('SETTINGS', next);
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
```

#### `LocationContext.jsx`

```jsx
import { createContext, useContext, useState } from 'react';
import { load, save } from '../lib/storage';

const Ctx = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(() => load('LOCATION'));

  const setLocation = (loc) => {
    save('LOCATION', loc);
    setLocationState(loc);
  };

  return <Ctx.Provider value={{ location, setLocation }}>{children}</Ctx.Provider>;
}

export const useLocation = () => useContext(Ctx);
```

#### `WeatherContext.jsx`

```jsx
import { createContext, useContext, useState } from 'react';
import { load, save } from '../lib/storage';

const Ctx = createContext(null);

export function WeatherProvider({ children }) {
  const [weather, setWeatherState] = useState(() => load('CACHE'));

  const setWeather = (data) => {
    const stamped = { ...data, fetchedAt: Date.now() };
    save('CACHE', stamped);
    setWeatherState(stamped);
    window.dispatchEvent(new CustomEvent('weather:updated', { detail: stamped }));
  };

  return <Ctx.Provider value={{ weather, setWeather }}>{children}</Ctx.Provider>;
}

export const useWeather = () => useContext(Ctx);
```

---

### Step 6 — Weather polling hook (`src/hooks/useWeatherPoller.js`)

```js
import { useEffect, useRef } from 'react';
import { fetchCurrent, fetchForecast } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { useLocation } from '../context/LocationContext';
import { useWeather } from '../context/WeatherContext';

export function useWeatherPoller() {
  const { settings } = useSettings();
  const { location } = useLocation();
  const { setWeather } = useWeather();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!location || !settings.apiKey) return;

    const poll = async () => {
      try {
        const [current, forecast] = await Promise.all([
          fetchCurrent(location.lat, location.lon, settings.apiKey),
          fetchForecast(location.lat, location.lon, settings.apiKey),
        ]);
        setWeather({ current, forecast: forecast.list });
      } catch (e) {
        console.warn('Weather fetch failed', e);
      }
    };

    poll();
    timerRef.current = setInterval(poll, settings.weatherInterval * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [location?.lat, location?.lon, settings.apiKey, settings.weatherInterval]);
}
```

---

### Step 7 — GPS polling hook (`src/hooks/useGeolocation.js`)

```js
import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useLocation } from '../context/LocationContext';

export function useGeolocationPoller() {
  const { settings } = useSettings();
  const { location, setLocation } = useLocation();

  useEffect(() => {
    if (!navigator.geolocation) return;
    if (location?.source !== 'gps') return;

    const updateGps = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setLocation({
          lat: coords.latitude,
          lon: coords.longitude,
          source: 'gps',
          updatedAt: Date.now(),
        }),
        () => {},
        { timeout: 10000 }
      );
    };

    updateGps();
    const id = setInterval(updateGps, settings.gpsInterval * 60 * 1000);
    return () => clearInterval(id);
  }, [location?.source, settings.gpsInterval]);
}
```

---

### Step 8 — Trigger engine hook (`src/hooks/useTriggerEngine.js`)

```js
import { useEffect } from 'react';
import { loadTriggers, save } from '../lib/storage';
import { resolveTemplate } from '../lib/templateEngine';
import { useSettings } from '../context/SettingsContext';

function evaluate(condition, weather) {
  const { metric, operator, value, window: win } = condition;
  const forecast = weather.forecast ?? [];

  let observed;
  const now = Date.now();

  if (win === 'next_30min') {
    const soon = forecast.filter(f => f.dt * 1000 - now < 30 * 60 * 1000 && f.dt * 1000 > now);
    if (metric === 'rain_probability') {
      observed = Math.max(0, ...soon.map(f => (f.pop ?? 0) * 100));
    }
  } else if (win === 'tomorrow') {
    const tomorrowStart = new Date(); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0,0,0,0);
    const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setHours(23,59,59,999);
    const slots = forecast.filter(f => f.dt * 1000 >= tomorrowStart && f.dt * 1000 <= tomorrowEnd);
    if (metric === 'temp_min') observed = Math.min(...slots.map(f => f.main.temp_min ?? f.main.temp));
    if (metric === 'temp_max') observed = Math.max(...slots.map(f => f.main.temp_max ?? f.main.temp));
    if (metric === 'humidity') observed = Math.max(...slots.map(f => f.main.humidity));
    if (metric === 'wind_speed') observed = Math.max(...slots.map(f => f.wind.speed));
  }

  if (observed === undefined) return false;
  if (operator === 'gte') return observed >= value;
  if (operator === 'lte') return observed <= value;
  if (operator === 'eq')  return observed === value;
  return false;
}

export function useTriggerEngine() {
  const { settings } = useSettings();

  useEffect(() => {
    const handler = ({ detail: weather }) => {
      const triggers = loadTriggers();
      const now = Date.now();
      let changed = false;

      triggers.forEach(trigger => {
        if (!trigger.enabled) return;
        const cooldown = 60 * 60 * 1000; // 1h between same trigger
        if (trigger.lastFiredAt && now - trigger.lastFiredAt < cooldown) return;

        if (evaluate(trigger.condition, weather)) {
          const body = resolveTemplate(trigger.template, weather, settings);
          navigator.serviceWorker?.ready.then(reg => {
            reg.showNotification(trigger.name, {
              body,
              icon: '/icons/icon-192.png',
              badge: '/icons/badge-72.png',
            });
          });
          trigger.lastFiredAt = now;
          changed = true;
        }
      });

      if (changed) save('TRIGGERS', triggers);
    };

    window.addEventListener('weather:updated', handler);
    return () => window.removeEventListener('weather:updated', handler);
  }, [settings.tempUnit, settings.dateFormat]);
}
```

---

### Step 9 — Template engine (`src/lib/templateEngine.js`)

```js
import { formatTemp, formatDate } from './format';

export function resolveTemplate(template, weather, settings) {
  const forecast = weather.forecast ?? [];
  const current = weather.current ?? {};

  const temp = formatTemp(current.main?.temp, settings.tempUnit);
  const wind = current.wind?.speed?.toFixed(1) ?? '?';
  const humidity = current.main?.humidity ?? '?';
  const eventTime = forecast[0]?.dt ? formatDate(forecast[0].dt * 1000, settings.dateFormat) : '?';

  return template
    .replace(/@/g, temp)
    .replace(/\$/g, wind)
    .replace(/%/g, humidity)
    .replace(/&/g, eventTime);
}
```

---

### Step 10 — Formatting helpers (`src/lib/format.js`)

```js
export function formatTemp(celsius, unit) {
  if (celsius == null) return '?';
  if (unit === 'F') return `${((celsius * 9) / 5 + 32).toFixed(1)}°F`;
  if (unit === 'K') return `${(celsius + 273.15).toFixed(1)} K`;
  return `${celsius.toFixed(1)}°C`;
}

export function formatDate(ts, fmt) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const map = {
    'DD': pad(d.getDate()),
    'MM': pad(d.getMonth() + 1),
    'YYYY': d.getFullYear(),
    'HH': pad(d.getHours()),
    'mm': pad(d.getMinutes()),
    'hh': pad(d.getHours() % 12 || 12),
    'a': d.getHours() < 12 ? 'am' : 'pm',
  };
  return fmt.replace(/DD|MM|YYYY|HH|hh|mm|a/g, m => map[m] ?? m);
}
```

---

### Step 11 — Service Worker (`src/sw/sw.js`)

```js
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST); // injected by vite-plugin-pwa

// OWM API — network-first, 15 min cache
registerRoute(
  ({ url }) => url.hostname === 'api.openweathermap.org',
  new NetworkFirst({
    cacheName: 'wtr-api-v1',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 15 * 60, maxEntries: 20 })],
  })
);

// Map tiles — stale while revalidate
registerRoute(
  ({ url }) => url.hostname.includes('tile.openstreetmap.org'),
  new StaleWhileRevalidate({ cacheName: 'wtr-tiles-v1' })
);

// Push notification handler
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'WeatherPWA', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
    })
  );
});
```

---

### Step 12 — Location Modal flow

**`LocationModal.jsx`** renders when `location === null`. Two tabs:

1. **Search tab** — `<input>` → debounced `geocodeCity()` → list of results with country flag → click sets location.
2. **Map tab** — `<MapPicker />` which initializes Leaflet on a `<div>`, centres on IP-geolocation fallback (`https://ipapi.co/json` cached) or default `[50.45, 30.52]` (Kyiv), lets user drag a marker, on confirm calls `reverseGeocode()` → sets location.

---

### Step 13 — App shell and routing (`App.jsx`)

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useLocation as useAppLocation } from './context/LocationContext';
import LocationModal from './components/location/LocationModal';
import AppShell from './components/layout/AppShell';
import WeatherPage from './pages/WeatherPage';
import TriggersPage from './pages/TriggersPage';
import SettingsPage from './pages/SettingsPage';
import { useWeatherPoller } from './hooks/useWeatherPoller';
import { useGeolocationPoller } from './hooks/useGeolocation';
import { useTriggerEngine } from './hooks/useTriggerEngine';

export default function App() {
  const { location } = useAppLocation();
  useWeatherPoller();
  useGeolocationPoller();
  useTriggerEngine();

  return (
    <>
      {!location && <LocationModal />}
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/weather" replace />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/triggers" element={<TriggersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </>
  );
}
```

---

### Step 14 — Trigger Editor UI

`TriggerEditor.jsx` renders a modal/drawer with:
- Name field
- Metric select: `rain_probability | temp_min | temp_max | wind_speed | humidity`
- Operator select: `gte | lte | eq`
- Value number input
- Window select: `next_30min | today | tomorrow`
- Template textarea with a legend showing `@`, `$`, `%`, `&` symbols and what they expand to, plus a live preview line
- Save → patches `wtr_triggers` array in localStorage

---

## Implementation Order (Milestones)

| Milestone | Deliverables |
|-----------|-------------|
| M1 | Vite scaffold, PWA manifest, SW registration, empty tab shell |
| M2 | `localStorage` helpers, Settings page, API key input |
| M3 | Location resolution (GPS → modal → search → map) |
| M4 | Weather fetch, poller, `WeatherContext`, current + forecast display |
| M5 | Trigger engine, default triggers, notification firing |
| M6 | Trigger Editor UI (create/edit/delete custom triggers) |
| M7 | Format helpers (temp units, date formats, template engine) |
| M8 | Offline banner, error toasts, SW cache tuning |
| M9 | Icons, splash screens, polish, lighthouse audit |

---

## API Key

Users must supply their own free OpenWeatherMap API key at [https://openweathermap.org/api](https://openweathermap.org/api). The key is stored in `wtr_settings.apiKey` only — never transmitted to any server other than `api.openweathermap.org`.
