import { useEffect, useRef, useCallback } from 'react'
import { loadTriggers, saveTriggers, loadRaw } from '../lib/storage.js'
import { evaluate }        from '../lib/triggerEval.js'
import { resolveTemplate } from '../lib/templateEngine.js'
import { fireNotification } from '../lib/notifications.js'
import { writeSWConfig, mergeSWCooldowns } from '../lib/swShare.js'
import { useSettings }   from '../context/SettingsContext.jsx'
import { useLocation }   from '../context/LocationContext.jsx'

const COOLDOWN_MS = 60 * 60 * 1000

export function useTriggerEngine() {
  const { settings } = useSettings()
  const { location } = useLocation()

  // Refs so the stable checkTriggers callback always reads current values
  const settingsRef = useRef(settings)
  const locationRef = useRef(location)
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { locationRef.current = location }, [location])

  const checkTriggers = useCallback(async (weather) => {
    const triggers = loadTriggers()
    const now = Date.now()
    let dirty = false

    for (const trigger of triggers) {
      if (!trigger.enabled) continue
      if (trigger.lastFiredAt && now - trigger.lastFiredAt < COOLDOWN_MS) continue
      if (!evaluate(trigger.condition, weather)) continue

      const body = resolveTemplate(trigger.template, weather, settingsRef.current)
      await fireNotification(trigger.name, body, trigger.icon ?? '')
      trigger.lastFiredAt = now
      dirty = true
    }

    if (dirty) {
      saveTriggers(triggers)
      // Keep SW config in sync so background runs see fresh cooldown timestamps
      writeSWConfig({
        location: locationRef.current,
        triggers,
        settings: settingsRef.current,
      }).catch(() => {})
    }
  }, [])

  // On mount: merge cooldowns from any SW background run, then check cached weather
  useEffect(() => {
    async function onMount() {
      const merged = await mergeSWCooldowns(loadTriggers())
      saveTriggers(merged)

      const cached = loadRaw('CACHE')
      if (cached) await checkTriggers(cached)
    }
    onMount()
  }, [checkTriggers])

  // Check on every foreground weather update
  useEffect(() => {
    const handler = ({ detail: weather }) => checkTriggers(weather)
    window.addEventListener('weather:updated', handler)
    return () => window.removeEventListener('weather:updated', handler)
  }, [checkTriggers])
}
