import { useEffect, useRef } from 'react'
import { fetchWeather } from '../lib/openMeteo.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { useLocation } from '../context/LocationContext.jsx'
import { useWeather } from '../context/WeatherContext.jsx'

export function useWeatherPoller() {
  const { settings } = useSettings()
  const { location } = useLocation()
  const { setWeather, setError, setLoading } = useWeather()
  const timerRef = useRef(null)

  useEffect(() => {
    if (!location) return

    const poll = async () => {
      setLoading(true)
      try {
        const data = await fetchWeather(location.lat, location.lon)
        setWeather(data)
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
