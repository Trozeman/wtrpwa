// Open-Meteo — free, no API key, real-time current + 7-day forecast
// https://open-meteo.com/en/docs

const BASE = 'https://api.open-meteo.com/v1/forecast'

export async function fetchWeather(lat, lon) {
  const url = new URL(BASE)
  url.searchParams.set('latitude',  lat.toFixed(6))
  url.searchParams.set('longitude', lon.toFixed(6))
  url.searchParams.set('current', [
    'temperature_2m', 'relative_humidity_2m',
    'wind_speed_10m', 'wind_direction_10m',
    'precipitation', 'cloud_cover', 'weather_code', 'is_day',
  ].join(','))
  url.searchParams.set('hourly', [
    'temperature_2m', 'relative_humidity_2m', 'wind_speed_10m',
    'precipitation_probability', 'precipitation', 'cloud_cover',
  ].join(','))
  url.searchParams.set('daily', [
    'temperature_2m_max', 'temperature_2m_min',
    'precipitation_sum', 'precipitation_probability_max',
  ].join(','))
  url.searchParams.set('wind_speed_unit', 'ms')  // keep m/s; formatWindSpeed() handles conversion
  url.searchParams.set('timezone',      'auto')
  url.searchParams.set('forecast_days', '7')
  url.searchParams.set('past_hours',    '24')    // 24 h of history for the hourly strip
  url.searchParams.set('timeformat',    'unixtime')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`)
  const data = await res.json()

  // ── Current ──────────────────────────────────────────────
  const c = data.current
  const hTimes = data.hourly.time

  // Find the hourly slot closest to the current time to pull precipitation probability
  const nowTs  = c.time
  const nowIdx = hTimes.reduce(
    (best, t, i) => Math.abs(t - nowTs) < Math.abs(hTimes[best] - nowTs) ? i : best,
    0,
  )

  const current = {
    dt:            c.time,
    temp:          c.temperature_2m,
    humidity:      c.relative_humidity_2m,
    wind_speed:    c.wind_speed_10m,
    wind_deg:      c.wind_direction_10m,
    precipitation: c.precipitation  ?? 0,
    cloudiness:    c.cloud_cover    ?? 0,
    pop:           (data.hourly.precipitation_probability[nowIdx] ?? 0) / 100,
  }

  // ── Hourly strip: ±12 h around now ───────────────────────
  const hStart = Math.max(0, nowIdx - 12)
  const hEnd   = Math.min(hTimes.length, nowIdx + 13)

  const forecast = hTimes.slice(hStart, hEnd).map((dt, i) => {
    const idx = hStart + i
    return {
      dt,
      temp:          data.hourly.temperature_2m[idx],
      humidity:      data.hourly.relative_humidity_2m[idx],
      wind_speed:    data.hourly.wind_speed_10m[idx],
      precipitation: data.hourly.precipitation[idx]             ?? 0,
      cloudiness:    data.hourly.cloud_cover[idx]               ?? 0,
      pop:           (data.hourly.precipitation_probability[idx] ?? 0) / 100,
    }
  })

  // ── Daily: 7-day forecast ─────────────────────────────────
  const daily = data.daily.time.map((dt, i) => ({
    dt,
    temp:          (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2,
    temp_min:      data.daily.temperature_2m_min[i],
    temp_max:      data.daily.temperature_2m_max[i],
    precipitation: data.daily.precipitation_sum[i] ?? 0,
  }))

  return {
    current,
    forecast,
    daily,
    source:      'Open-Meteo',
    isHistorical: false,
    fetchedAt:   Date.now(),
  }
}
