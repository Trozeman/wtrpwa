// NASA POWER API — free, no API key required
// https://power.larc.nasa.gov/api/
// Note: data has ~48-72h latency in practice (historical, not forecast)

const BASE = 'https://power.larc.nasa.gov/api/temporal'
const COMMUNITY = 'RE'

const HOURLY_PARAMS = [
  'T2M',         // Temperature at 2m (°C)
  'RH2M',        // Relative Humidity at 2m (%)
  'WS10M',       // Wind Speed at 10m (m/s)
  'WD10M',       // Wind Direction at 10m (°)
  'PRECTOTCORR', // Precipitation corrected (mm/h)
  'CLOUD_AMT',   // Cloud Amount (%)
].join(',')

const DAILY_PARAMS = [
  'T2M',         // Mean Temperature (°C)
  'T2M_MAX',     // Max Temperature (°C)
  'T2M_MIN',     // Min Temperature (°C)
  'RH2M',        // Mean Humidity (%)
  'WS10M',       // Mean Wind Speed (m/s)
  'PRECTOTCORR', // Total Precipitation (mm/day)
].join(',')

// ── Date helpers ──────────────────────────────────────────

function yyyymmdd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// Parse "YYYYMMDDHH" key → Unix seconds (treated as local time)
function parseHourlyKey(key) {
  const y  = parseInt(key.slice(0, 4), 10)
  const mo = parseInt(key.slice(4, 6), 10) - 1
  const d  = parseInt(key.slice(6, 8), 10)
  const h  = parseInt(key.slice(8, 10), 10)
  return new Date(y, mo, d, h, 0, 0).getTime() / 1000
}

// Parse "YYYYMMDD" key → Unix seconds (noon local time)
function parseDailyKey(key) {
  const y  = parseInt(key.slice(0, 4), 10)
  const mo = parseInt(key.slice(4, 6), 10) - 1
  const d  = parseInt(key.slice(6, 8), 10)
  return new Date(y, mo, d, 12, 0, 0).getTime() / 1000
}

// ── Fetch ─────────────────────────────────────────────────

async function powerFetch(temporal, params, lat, lon, start, end) {
  const url = new URL(`${BASE}/${temporal}/point`)
  url.searchParams.set('parameters', params)
  url.searchParams.set('community', COMMUNITY)
  url.searchParams.set('latitude',  lat.toFixed(6))
  url.searchParams.set('longitude', lon.toFixed(6))
  url.searchParams.set('start',     start)
  url.searchParams.set('end',       end)
  url.searchParams.set('format',    'JSON')

  const res = await fetch(url.toString())
  if (res.status === 422) throw new Error('NASA POWER: invalid parameters or date range')
  if (res.status === 429) throw new Error('NASA POWER: rate limit exceeded')
  if (!res.ok)            throw new Error(`NASA POWER error ${res.status}`)
  return res.json()
}

// ── Normalize ─────────────────────────────────────────────

function normalizeHourly(raw) {
  const p = raw?.properties?.parameter ?? {}
  const allKeys = Object.keys(p.T2M ?? {}).sort()

  return allKeys
    .map(key => {
      const get = (param) => {
        const v = p[param]?.[key]
        return (v == null || v === -999) ? null : v
      }
      return {
        dt:            parseHourlyKey(key),
        temp:          get('T2M'),
        humidity:      get('RH2M'),
        wind_speed:    get('WS10M'),
        wind_deg:      get('WD10M'),
        precipitation: get('PRECTOTCORR') ?? 0,
        cloudiness:    get('CLOUD_AMT'),
        // derive a 0-1 rain-probability proxy from precipitation rate
        pop:           (get('PRECTOTCORR') ?? 0) > 0.1 ? 1 : 0,
      }
    })
    .filter(h => h.temp !== null)
}

function normalizeDaily(raw) {
  const p = raw?.properties?.parameter ?? {}
  const allKeys = Object.keys(p.T2M ?? {}).sort()

  return allKeys
    .map(key => {
      const get = (param) => {
        const v = p[param]?.[key]
        return (v == null || v === -999) ? null : v
      }
      return {
        dt:            parseDailyKey(key),
        temp:          get('T2M'),
        temp_min:      get('T2M_MIN'),
        temp_max:      get('T2M_MAX'),
        humidity:      get('RH2M'),
        wind_speed:    get('WS10M'),
        precipitation: get('PRECTOTCORR') ?? 0,
      }
    })
    .filter(d => d.temp !== null)
}

// ── Public API ────────────────────────────────────────────

export async function fetchWeather(lat, lon) {
  const [hourlyRaw, dailyRaw] = await Promise.all([
    powerFetch(
      'hourly', HOURLY_PARAMS, lat, lon,
      yyyymmdd(daysAgo(5)), yyyymmdd(new Date())
    ),
    powerFetch(
      'daily', DAILY_PARAMS, lat, lon,
      yyyymmdd(daysAgo(10)), yyyymmdd(new Date())
    ),
  ])

  const hourly = normalizeHourly(hourlyRaw)
  const daily  = normalizeDaily(dailyRaw)

  // "Current" = most recent available hourly point
  const current = hourly.length ? hourly[hourly.length - 1] : null

  return {
    current,
    forecast: hourly,   // recent hourly — used by trigger engine
    daily,              // recent daily — used by trigger engine (min/max)
    source: 'NASA POWER',
    isHistorical: true, // data has ~48-72h latency, no forecast
    fetchedAt: Date.now(),
  }
}
