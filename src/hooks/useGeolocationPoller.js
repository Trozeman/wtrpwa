import { useEffect, useRef } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useLocation } from '../context/LocationContext.jsx'

export function useGeolocationPoller() {
  const { settings } = useSettings()
  const { location, setLocation } = useLocation()
  const timerRef = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    if (location?.source !== 'gps') return

    const update = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setLocation({
          lat: coords.latitude,
          lon: coords.longitude,
          name: location.name,
          country: location.country,
          source: 'gps',
        }),
        () => {},
        { timeout: 10000, maximumAge: 30000 }
      )
    }

    timerRef.current = setInterval(update, settings.gpsInterval * 60 * 1000)
    return () => clearInterval(timerRef.current)
  }, [location?.source, settings.gpsInterval])
}
