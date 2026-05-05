import { useState } from 'react'
import { useLocation } from '../../context/LocationContext.jsx'
import CitySearch from './CitySearch.jsx'
import MapPicker from './MapPicker.jsx'
import styles from './LocationModal.module.css'

const TABS = [
  { id: 'search', label: 'Search city' },
  { id: 'map',    label: 'Pick on map' },
]

export default function LocationModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('search')
  const [gpsState, setGpsState]   = useState('idle') // idle | loading | error
  const { setLocation } = useLocation()

  function handleGps() {
    if (!navigator.geolocation) {
      setGpsState('error')
      return
    }
    setGpsState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'gps' })
        onClose?.()
      },
      () => setGpsState('error'),
      { timeout: 10000 },
    )
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Set your location">
      <div className={styles.sheet}>
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <div className={styles.headerRow}>
            <h2 className={styles.title}>Set your location</h2>
            {onClose && (
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
            )}
          </div>
          <p className={styles.subtitle}>
            Search for a city, pick on map, or use GPS.
          </p>
        </div>

        <div className={styles.gpsRow}>
          <button
            className={`${styles.gpsBtn} ${gpsState === 'loading' ? styles.gpsBtnLoading : ''}`}
            onClick={handleGps}
            disabled={gpsState === 'loading'}
          >
            {gpsState === 'loading' ? 'Locating…' : '📍 Use my current location (GPS)'}
          </button>
          {gpsState === 'error' && (
            <span className={styles.gpsError}>GPS unavailable — try search or map</span>
          )}
        </div>

        <div className={styles.tabs} role="tablist">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {activeTab === 'search' && <CitySearch onSelect={onClose} />}
          {activeTab === 'map'    && <MapPicker  onSelect={onClose} />}
        </div>
      </div>
    </div>
  )
}
