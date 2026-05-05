const KEYS = {
  SETTINGS: 'wtr_settings',
  LOCATION: 'wtr_location',
  CACHE: 'wtr_cache',
  TRIGGERS: 'wtr_triggers',
}

const DEFAULT_SETTINGS = {
  tempUnit: 'C',
  dateFormat: 'DD.MM.YYYY HH:mm',
  weatherInterval: 15,
  gpsInterval: 5,
}

const DEFAULT_TRIGGERS = [
  {
    id: 'default-rain',
    name: 'Recent rain',
    icon: '🌧',
    enabled: true,
    condition: { metric: 'rain_probability', operator: 'gte', value: 80, window: 'next_30min' },
    template: 'Rain detected at &. Humidity: %',
    lastFiredAt: null,
  },
  {
    id: 'default-cold',
    name: 'Cold conditions',
    icon: '❄️',
    enabled: true,
    condition: { metric: 'temp_min', operator: 'lte', value: 15, window: 'tomorrow' },
    template: 'Cold recently: @. Wind: $',
    lastFiredAt: null,
  },
  {
    id: 'default-hot',
    name: 'Hot conditions',
    icon: '🔥',
    enabled: true,
    condition: { metric: 'temp_max', operator: 'gte', value: 30, window: 'tomorrow' },
    template: 'Hot recently: @. Humidity: %',
    lastFiredAt: null,
  },
]

export function loadRaw(key) {
  try {
    const raw = localStorage.getItem(KEYS[key])
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveRaw(key, data) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(data))
  } catch (e) {
    console.warn('localStorage write failed', e)
  }
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...(loadRaw('SETTINGS') ?? {}) }
}

export function loadTriggers() {
  return loadRaw('TRIGGERS') ?? DEFAULT_TRIGGERS
}

export function saveTriggers(triggers) {
  saveRaw('TRIGGERS', triggers)
}

export function clearAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
