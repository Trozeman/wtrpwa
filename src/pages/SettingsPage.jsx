import { useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useLocation } from '../context/LocationContext.jsx'
import { formatDate, formatTemp } from '../lib/format.js'
import { clearAll } from '../lib/storage.js'
import LocationModal from '../components/location/LocationModal.jsx'
import styles from './SettingsPage.module.css'

const DATE_FORMATS = [
  { value: 'DD.MM.YYYY HH:mm', label: 'DD.MM.YYYY HH:mm' },
  { value: 'MM/DD/YYYY hh:mm a', label: 'MM/DD/YYYY hh:mm a' },
  { value: 'YYYY-MM-DD HH:mm', label: 'YYYY-MM-DD HH:mm (ISO)' },
]

const TEMP_UNITS = [
  { value: 'C', label: '°C' },
  { value: 'F', label: '°F' },
  { value: 'K', label: 'K' },
]

const PREVIEW_TEMP_C = 22.5
const PREVIEW_TS = Date.now()

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const { location } = useLocation()

  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [confirmReset, setConfirmReset] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)

  const datePreview = formatDate(PREVIEW_TS, settings.dateFormat)
  const tempPreview = formatTemp(PREVIEW_TEMP_C, settings.tempUnit)

  function handleRequestNotif() {
    Notification.requestPermission().then(p => setNotifPermission(p))
  }

  function handleReset() {
    clearAll()
    window.location.reload()
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Settings</h1>

      {/* ── Data source ───────────────────────────────────── */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Data source</p>
        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <div>
              <div className={styles.label}>Open-Meteo</div>
              <div className={styles.sublabel}>Free · No API key · Real-time current + 7-day forecast</div>
            </div>
            <span className={`${styles.badge} ${styles.badgeGranted}`}>Active</span>
          </div>
          <div className={styles.apiNote}>
            <WeatherIcon />
            <span>
              Provides real-time temperature, humidity, wind, and precipitation
              from numerical weather models. Data is updated hourly.{' '}
              <a
                className={styles.link}
                href="https://open-meteo.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more ↗
              </a>
            </span>
          </div>
          <div className={styles.apiChips}>
            <span className={styles.chip}>Geocoding: OpenStreetMap Nominatim</span>
          </div>
        </div>
      </section>

      {/* ── Display ───────────────────────────────────────── */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Display</p>

        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <div>
              <div className={styles.label}>Temperature unit</div>
              <div className={styles.sublabel}>Preview: {tempPreview}</div>
            </div>
            <div className={styles.chips}>
              {TEMP_UNITS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`${styles.chip} ${settings.tempUnit === value ? styles.chipActive : ''}`}
                  onClick={() => update({ tempUnit: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.label}>Date &amp; time format</div>
          <select
            className={styles.formatSelect}
            value={settings.dateFormat}
            onChange={e => update({ dateFormat: e.target.value })}
          >
            {DATE_FORMATS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <span className={styles.formatPreview}>Preview: {datePreview}</span>
        </div>
      </section>

      {/* ── Update intervals ──────────────────────────────── */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Update intervals</p>

        <div className={styles.row}>
          <div className={styles.label}>Weather refresh</div>
          <div className={styles.sublabel}>Fetch new data every N minutes</div>
          <div className={styles.sliderWrap}>
            <div className={styles.sliderRow}>
              <input
                className={styles.slider}
                type="range"
                min={5}
                max={120}
                step={5}
                value={settings.weatherInterval}
                onChange={e => update({ weatherInterval: Number(e.target.value) })}
              />
              <span className={styles.sliderValue}>{settings.weatherInterval} min</span>
            </div>
            <div className={styles.sliderHints}>
              <span>5 min</span>
              <span>2 h</span>
            </div>
          </div>
        </div>

        {location?.source === 'gps' && (
          <div className={styles.row}>
            <div className={styles.label}>GPS location refresh</div>
            <div className={styles.sublabel}>Re-check device location every N minutes</div>
            <div className={styles.sliderWrap}>
              <div className={styles.sliderRow}>
                <input
                  className={styles.slider}
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={settings.gpsInterval}
                  onChange={e => update({ gpsInterval: Number(e.target.value) })}
                />
                <span className={styles.sliderValue}>{settings.gpsInterval} min</span>
              </div>
              <div className={styles.sliderHints}>
                <span>1 min</span>
                <span>1 h</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Notifications ─────────────────────────────────── */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Notifications</p>

        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <div>
              <div className={styles.label}>Push notifications</div>
              <div className={styles.sublabel}>Required for trigger alerts</div>
            </div>
            <NotifBadge permission={notifPermission} />
          </div>
          {notifPermission !== 'granted' && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleRequestNotif}
              disabled={notifPermission === 'denied'}
            >
              {notifPermission === 'denied'
                ? 'Blocked — enable in browser settings'
                : 'Enable notifications'}
            </button>
          )}
          {notifPermission === 'denied' && (
            <div className={styles.sublabel}>
              Click the lock icon in your browser&apos;s address bar → Notifications → Allow.
            </div>
          )}
        </div>
      </section>

      {/* ── Location ──────────────────────────────────────── */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Location</p>
        <div className={styles.row}>
          {location ? (
            <div className={styles.rowHeader}>
              <div>
                <div className={styles.label}>{location.name ?? 'Custom location'}</div>
                <div className={styles.sublabel}>
                  {location.lat.toFixed(4)}, {location.lon.toFixed(4)} · via {location.source}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.sublabel}>No location set</div>
          )}
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowLocationModal(true)}
          >
            Change location
          </button>
        </div>
      </section>

      {showLocationModal && (
        <LocationModal onClose={() => setShowLocationModal(false)} />
      )}

      {/* ── Danger zone ───────────────────────────────────── */}
      <section className={styles.section}>
        <p className={styles.sectionTitle}>Danger zone</p>
        <div className={styles.row}>
          <div className={styles.label}>Reset all settings</div>
          <div className={styles.sublabel}>
            Clears location, triggers, and all preferences.
          </div>
          {!confirmReset ? (
            <button className={styles.btnDanger} onClick={() => setConfirmReset(true)}>
              Reset to defaults
            </button>
          ) : (
            <>
              <div className={styles.sublabel} style={{ color: '#f87171' }}>
                This cannot be undone. Continue?
              </div>
              <div className={styles.confirmRow}>
                <button className={styles.btnConfirm} onClick={handleReset}>
                  Yes, reset everything
                </button>
                <button className={styles.btnCancel} onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 8 }}>
        Weather Notifier · all data stored locally
      </div>
    </div>
  )
}

function NotifBadge({ permission }) {
  if (permission === 'granted') return <span className={`${styles.badge} ${styles.badgeGranted}`}>Granted</span>
  if (permission === 'denied')  return <span className={`${styles.badge} ${styles.badgeDenied}`}>Blocked</span>
  return <span className={`${styles.badge} ${styles.badgeDefault}`}>Not set</span>
}

function WeatherIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="6" fill="#fbbf24" />
      <rect x="4" y="17" width="20" height="6" rx="3" fill="#60a5fa" />
      <path d="M8 17 Q11 11 16 14 Q18 10 22 13 Q25 13 24 17Z" fill="#e2e8f0" />
    </svg>
  )
}
