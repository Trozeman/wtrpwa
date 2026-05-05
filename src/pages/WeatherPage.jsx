import { useWeather } from '../context/WeatherContext.jsx'
import { useLocation } from '../context/LocationContext.jsx'
import { timeAgo, formatDate } from '../lib/format.js'
import { useSettings } from '../context/SettingsContext.jsx'
import CurrentWeather from '../components/weather/CurrentWeather.jsx'
import HourlyStrip from '../components/weather/HourlyStrip.jsx'
import DailyForecast from '../components/weather/DailyForecast.jsx'
import styles from './WeatherPage.module.css'

export default function WeatherPage() {
  const { weather, loading, error } = useWeather()
  const { location } = useLocation()
  const { settings } = useSettings()

  if (loading && !weather) return <LoadingState />
  if (error && !weather)   return <ErrorState message={error} />
  if (!weather)            return <EmptyState />

  // Use the slot matching the current hour-of-day for the main display —
  // this gives the most contextually relevant historical reading.
  const nowHour = new Date().getHours()
  const displayCurrent = (weather.forecast ?? []).slice().reverse().find(
    h => new Date(h.dt * 1000).getHours() === nowHour
  ) ?? weather.current

  const dataTime = displayCurrent?.dt
    ? formatDate(displayCurrent.dt * 1000, settings.dateFormat)
    : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.location}>
            {location?.name ?? 'Weather'}
            {location?.country ? `, ${location.country}` : ''}
          </h1>
          <div className={styles.meta}>
            {dataTime ? `At ${dataTime}` : ''}
            {weather.fetchedAt ? ` · fetched ${timeAgo(weather.fetchedAt)}` : ''}
          </div>
        </div>
        {loading && <div className={styles.spinner} aria-label="Updating…" />}
      </div>

      {weather.isHistorical && (
        <p className={styles.histNote}>
          NASA POWER data has ~48–72 h latency — showing recent conditions, not live readings
        </p>
      )}

      <CurrentWeather data={displayCurrent} />
      <HourlyStrip hours={weather.forecast} />
      <DailyForecast days={weather.daily} />
    </div>
  )
}

function LoadingState() {
  return (
    <div className={styles.state}>
      <div className={styles.stateSpinner} role="status" aria-label="Loading weather" />
      <p className={styles.stateTitle}>Fetching weather data…</p>
      <p className={styles.stateBody}>
        NASA POWER processes satellite data — first load may take up to 30 seconds.
      </p>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className={styles.state}>
      <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
      <p className={styles.stateTitle}>Could not load weather</p>
      <p className={styles.stateBody}>{message}</p>
      <button className={styles.retryBtn} onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className={styles.state}>
      <span className={styles.errorIcon} aria-hidden="true">🌤</span>
      <p className={styles.stateTitle}>No data yet</p>
      <p className={styles.stateBody}>Weather will load automatically once your location is set.</p>
    </div>
  )
}
