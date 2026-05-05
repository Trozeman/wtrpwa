import { useState } from 'react'
import CitySearch from './CitySearch.jsx'
import MapPicker from './MapPicker.jsx'
import styles from './LocationModal.module.css'

const TABS = [
  { id: 'search', label: 'Search city' },
  { id: 'map',    label: 'Pick on map' },
]

export default function LocationModal() {
  const [activeTab, setActiveTab] = useState('search')

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Set your location">
      <div className={styles.sheet}>
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <h2 className={styles.title}>Set your location</h2>
          <p className={styles.subtitle}>
            Location access was denied — search for a city or drop a pin on the map.
          </p>
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
          {activeTab === 'search' && <CitySearch />}
          {activeTab === 'map'    && <MapPicker />}
        </div>
      </div>
    </div>
  )
}
