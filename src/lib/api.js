// Geocoding via Nominatim (OpenStreetMap) — free, no key required
// Policy: include a descriptive User-Agent, max 1 req/s
// https://nominatim.org/release-docs/latest/api/Search/

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const HEADERS   = { 'User-Agent': 'WeatherPWA/1.0 (personal weather app)' }

async function nominatim(path, params) {
  const url = new URL(NOMINATIM + path)
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '1')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), { headers: HEADERS })
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`)
  return res.json()
}

// Normalize a Nominatim result to { lat, lon, name, state, country }
function normalizeNominatim(item) {
  const addr = item.address ?? {}
  const name =
    addr.city      ??
    addr.town      ??
    addr.village   ??
    addr.municipality ??
    addr.county    ??
    item.name      ??
    item.display_name?.split(',')[0] ??
    'Unknown'

  return {
    lat:     parseFloat(item.lat),
    lon:     parseFloat(item.lon),
    name,
    state:   addr.state ?? addr.region ?? null,
    country: (addr.country_code ?? '').toUpperCase() || null,
  }
}

// Search by city name — returns array compatible with CitySearch component
export async function geocodeCity(q) {
  const results = await nominatim('/search', {
    q,
    limit: 6,
    featuretype: 'city,town,village,municipality',
  })
  return results.map(normalizeNominatim)
}

// Reverse geocode coordinates → location info
export async function reverseGeocode(lat, lon) {
  const result = await nominatim('/reverse', { lat, lon })
  return [normalizeNominatim(result)]
}

// IP-based approximate location (for map initial centre)
export async function ipGeolocate() {
  const res = await fetch('https://ipapi.co/json/')
  if (!res.ok) throw new Error('IP geolocation failed')
  const data = await res.json()
  return {
    lat:     data.latitude,
    lon:     data.longitude,
    name:    data.city,
    country: data.country_code,
  }
}
