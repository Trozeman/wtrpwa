import { useEffect, useRef } from 'react'
import { loadTriggers, saveTriggers } from '../lib/storage.js'
import { resolveTemplate } from '../lib/templateEngine.js'
import { fireNotification } from '../lib/notifications.js'
import { useSettings } from '../context/SettingsContext.jsx'

const COOLDOWN_MS = 60 * 60 * 1000 // 1 h between re-fires of the same trigger

// ── Condition evaluation ──────────────────────────────────
//
// NASA POWER is historical (~72h latency), so window semantics are adapted:
//   next_30min → most recent hourly slot (was it raining?)
//   today      → most recent daily slot
//   tomorrow   → most recent daily slot (no forecast available)

function getObserved(metric, weather) {
  const current    = weather.current    ?? {}
  const forecast   = weather.forecast   ?? []
  const daily      = weather.daily      ?? []
  const latestHour = forecast[forecast.length - 1] ?? current
  const latestDay  = daily[daily.length - 1]        ?? {}

  switch (metric) {
    case 'rain_probability':
      // pop is 0|1 proxy; ×100 → 0 or 100 %
      return (latestHour.pop ?? 0) * 100

    case 'temp_min':
      return latestDay.temp_min ?? current.temp ?? null

    case 'temp_max':
      return latestDay.temp_max ?? current.temp ?? null

    case 'wind_speed':
      // stored as m/s, trigger values expressed in km/h
      return current.wind_speed != null ? current.wind_speed * 3.6 : null

    case 'humidity':
      return current.humidity ?? null

    default:
      return null
  }
}

function evaluate(condition, weather) {
  const observed = getObserved(condition.metric, weather)
  if (observed == null) return false
  const { operator, value } = condition
  if (operator === 'gte') return observed >= value
  if (operator === 'lte') return observed <= value
  if (operator === 'eq')  return Math.abs(observed - value) < 0.5
  return false
}

// ── Hook ──────────────────────────────────────────────────

export function useTriggerEngine() {
  const { settings } = useSettings()
  // Keep a ref so the event handler always reads the latest settings
  // without needing to be re-registered on every settings change.
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => {
    async function handleWeatherUpdate({ detail: weather }) {
      const triggers = loadTriggers()
      const now      = Date.now()
      let   dirty    = false

      for (const trigger of triggers) {
        if (!trigger.enabled) continue

        // Cooldown: don't re-fire within COOLDOWN_MS
        if (trigger.lastFiredAt && now - trigger.lastFiredAt < COOLDOWN_MS) continue

        if (!evaluate(trigger.condition, weather)) continue

        const body = resolveTemplate(trigger.template, weather, settingsRef.current)
        await fireNotification(trigger.name, body, trigger.icon ?? '')

        trigger.lastFiredAt = now
        dirty = true
      }

      if (dirty) saveTriggers(triggers)
    }

    window.addEventListener('weather:updated', handleWeatherUpdate)
    return () => window.removeEventListener('weather:updated', handleWeatherUpdate)
  }, []) // registered once; reads latest settings via ref
}
