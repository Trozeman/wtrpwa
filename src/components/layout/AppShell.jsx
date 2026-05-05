import { useState, useEffect } from 'react'
import { useWeather } from '../../context/WeatherContext.jsx'
import { useLocation } from '../../context/LocationContext.jsx'
import TabBar from './TabBar.jsx'
import styles from './AppShell.module.css'

export default function AppShell({ children }) {
  const [offline, setOffline] = useState(!navigator.onLine)
  const { weather, error } = useWeather()
  const { location } = useLocation()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (!error || !weather) return
    setToast(error)
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [error])

  const locationLine = location
    ? [location.name, location.state, location.country].filter(Boolean).join(', ')
    : null

  return (
    <div className={styles.shell}>
      {/* ── Persistent top bar ── */}
      <header className={styles.topBar}>
        <span className={styles.appName}>Weather Notifier</span>
        {locationLine && (
          <span className={styles.locationName} title={locationLine}>
            📍 {locationLine}
          </span>
        )}
      </header>

      {offline && (
        <div className={styles.offlineBanner} role="status">
          No internet connection — showing cached data
        </div>
      )}

      <main className={styles.main}>
        {children}
      </main>

      {toast && (
        <div className={styles.toast} role="alert">
          <span className={styles.toastMsg}>{toast}</span>
          <button className={styles.toastClose} onClick={() => setToast(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <TabBar />
    </div>
  )
}
