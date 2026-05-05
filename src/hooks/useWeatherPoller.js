import { useEffect, useRef } from 'react'
import { fetchWeather } from '../lib/openMeteo.js'
import { loadTriggers } from '../lib/storage.js'
import { writeSWConfig } from '../lib/swShare.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useLocation } from '../context/LocationContext.jsx'
import { useWeather }  from '../context/WeatherContext.jsx'

async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.periodicSync.register('weather-check', { minInterval: 60 * 60 * 1000 })
  } catch {}
}

export function useWeatherPoller() {
  const { settings } = useSettings()
  const { location } = useLocation()
  const { setWeather, setError, setLoading } = useWeather()
  const timerRef = useRef(null)

  // Register background sync once (silently fails on unsupported browsers)
  useEffect(() => { registerPeriodicSync() }, [])

  useEffect(() => {
    if (!location) return

    const poll = async () => {
      setLoading(true)
      try {
        const data = await fetchWeather(location.lat, location.lon)
        setWeather(data)
        // Keep SW shared config fresh so background sync can evaluate triggers
        writeSWConfig({ location, triggers: loadTriggers(), settings }).catch(() => {})
      } catch (e) {
        console.warn('Weather fetch failed', e.message)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    poll()
    timerRef.current = setInterval(poll, settings.weatherInterval * 60 * 1000)
    return () => clearInterval(timerRef.current)
  }, [location?.lat, location?.lon, settings.weatherInterval])
}
