const DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']

export function windDirection(deg) {
  if (deg == null) return '—'
  return DIRS[Math.round(deg / 22.5) % 16]
}

export function weatherCondition(cloudiness, precipitation) {
  const p = precipitation ?? 0
  const c = cloudiness ?? 0
  if (p > 5)   return { label: 'Heavy Rain',    symbol: '⛈' }
  if (p > 1)   return { label: 'Rain',           symbol: '🌧' }
  if (p > 0.1) return { label: 'Light Rain',     symbol: '🌦' }
  if (c > 87)  return { label: 'Overcast',       symbol: '☁️' }
  if (c > 62)  return { label: 'Mostly Cloudy',  symbol: '🌥' }
  if (c > 37)  return { label: 'Partly Cloudy',  symbol: '⛅' }
  if (c > 12)  return { label: 'Mostly Clear',   symbol: '🌤' }
  return         { label: 'Clear',               symbol: '☀️' }
}

// Heat index (°C) — valid when t ≥ 27 °C and rh ≥ 40 %
function heatIndex(t, rh) {
  return (
    -8.78469475556 +
    1.61139411 * t +
    2.33854883889 * rh -
    0.14611605 * t * rh -
    0.012308094 * t * t -
    0.0164248277778 * rh * rh +
    0.002211732 * t * t * rh +
    0.00072546 * t * rh * rh -
    0.000003582 * t * t * rh * rh
  )
}

// Wind chill (°C) — valid when t ≤ 10 °C and ws > 4.8 km/h
function windChill(t, wsKph) {
  return (
    13.12 +
    0.6215 * t -
    11.37 * Math.pow(wsKph, 0.16) +
    0.3965 * t * Math.pow(wsKph, 0.16)
  )
}

export function feelsLike(tempC, humidity, windSpeedMs) {
  if (tempC == null) return null
  const rh = humidity ?? 50
  const wsKph = (windSpeedMs ?? 0) * 3.6

  if (tempC >= 27 && rh >= 40) return Math.round(heatIndex(tempC, rh) * 10) / 10
  if (tempC <= 10 && wsKph > 4.8) return Math.round(windChill(tempC, wsKph) * 10) / 10
  return tempC
}

// Returns a 0-100 "sky clarity" for gradient backgrounds
export function skyClarity(cloudiness) {
  return Math.max(0, 100 - (cloudiness ?? 50))
}
