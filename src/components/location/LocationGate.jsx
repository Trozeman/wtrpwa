import { useState, useEffect } from 'react'
import { useLocation } from '../../context/LocationContext.jsx'
import LocationModal from './LocationModal.jsx'
import styles from './LocationGate.module.css'

// Tries GPS silently first. Shows a minimal splash while requesting,
// then either resolves automatically or falls through to LocationModal.
export default function LocationGate({ children }) {
  const { location, setLocation } = useLocation()
  const [gpsState, setGpsState] = useState(() => location ? 'done' : 'requesting')

  useEffect(() => {
    if (location) return

    if (!navigator.geolocation) {
      setGpsState('denied')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lon: coords.longitude, source: 'gps' })
        setGpsState('done')
      },
      () => setGpsState('denied'),
      { timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  if (gpsState === 'done' || location) return children

  if (gpsState === 'requesting') {
    return (
      <div className={styles.splash}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.label}>Requesting location…</p>
      </div>
    )
  }

  // gpsState === 'denied'
  return (
    <>
      {children}
      <LocationModal />
    </>
  )
}
