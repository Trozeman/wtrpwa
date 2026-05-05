import { useState, useEffect, useRef } from 'react'
import { useWeather } from '../../context/WeatherContext.jsx'
import { useLocation } from '../../context/LocationContext.jsx'
import TabBar from './TabBar.jsx'
import styles from './AppShell.module.css'

export default function AppShell({ children }) {
  const [offline, setOffline] = useState(!navigator.onLine)
  const { weather, error } = useWeather()
  const { location } = useLocation()
  const [toast, setToast] = useState(null)
  const [updateReady, setUpdateReady] = useState(false)
  const waitingSwRef = useRef(null)

  // Offline detection
  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Background refresh error toast
  useEffect(() => {
    if (!error || !weather) return
    setToast(error)
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [error])

  // SW update detection
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(reg => {
      // Already waiting (e.g. page was reloaded mid-update)
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingSwRef.current = reg.waiting
        setUpdateReady(true)
      }

      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            waitingSwRef.current = sw
            setUpdateReady(true)
          }
        })
      })
    })

    // When the new SW takes control, reload so the user gets fresh assets
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload() }
    })
  }, [])

  function applyUpdate() {
    waitingSwRef.current?.postMessage({ type: 'SKIP_WAITING' })
  }

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

      {updateReady && (
        <div className={styles.updateBanner} role="status">
          <span>New version available</span>
          <button className={styles.updateBtn} onClick={applyUpdate}>Update now</button>
        </div>
      )}

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
