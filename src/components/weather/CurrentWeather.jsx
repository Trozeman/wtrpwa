import { useSettings } from '../../context/SettingsContext.jsx'
import { formatTemp, formatWindSpeed } from '../../lib/format.js'
import { weatherCondition, feelsLike, windDirection } from '../../lib/weather.js'
import styles from './CurrentWeather.module.css'

export default function CurrentWeather({ data }) {
  const { settings } = useSettings()

  if (!data) return null

  const cond   = weatherCondition(data.cloudiness, data.precipitation)
  const fl     = feelsLike(data.temp, data.humidity, data.wind_speed)
  const flStr  = fl !== data.temp ? `Feels ${formatTemp(fl, settings.tempUnit)}` : null
  const wDir   = windDirection(data.wind_deg)
  const windKph = formatWindSpeed(data.wind_speed)

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.tempBlock}>
          <div className={styles.temp}>{formatTemp(data.temp, settings.tempUnit)}</div>
          {flStr && <div className={styles.feelsLike}>{flStr}</div>}
        </div>
        <div className={styles.condBlock}>
          <span className={styles.symbol} role="img" aria-label={cond.label}>{cond.symbol}</span>
          <span className={styles.condLabel}>{cond.label}</span>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Humidity</span>
          <span className={styles.metricValue}>{data.humidity != null ? `${Math.round(data.humidity)}%` : '—'}</span>
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>Wind</span>
          <span className={styles.metricValue}>{windKph} <span style={{fontSize:13}}>km/h</span></span>
          <span className={styles.metricSub}>{wDir}</span>
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>Cloud cover</span>
          <span className={styles.metricValue}>{data.cloudiness != null ? `${Math.round(data.cloudiness)}%` : '—'}</span>
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>Precipitation</span>
          <span className={styles.metricValue}>
            {data.precipitation != null ? `${data.precipitation.toFixed(1)}` : '—'}
            <span style={{fontSize:13}}> mm/h</span>
          </span>
        </div>
      </div>
    </div>
  )
}
