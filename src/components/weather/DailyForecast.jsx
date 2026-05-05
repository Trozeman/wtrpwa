import { useSettings } from '../../context/SettingsContext.jsx'
import { formatTemp } from '../../lib/format.js'
import { weatherCondition } from '../../lib/weather.js'
import styles from './DailyForecast.module.css'

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function DailyForecast({ days }) {
  const { settings } = useSettings()

  if (!days?.length) return null

  // Compute global min/max for proportional bar widths
  const allMin = Math.min(...days.map(d => d.temp_min ?? d.temp ?? 0))
  const allMax = Math.max(...days.map(d => d.temp_max ?? d.temp ?? 0))
  const range  = allMax - allMin || 1

  return (
    <div className={styles.section}>
      <p className={styles.sectionHeader}>7-day forecast</p>
      <div className={styles.list}>
        {days.map(day => {
          const date    = new Date(day.dt * 1000)
          const dayName = DAY_NAMES[date.getDay()]
          const dateNum = date.getDate()
          const tMin   = day.temp_min ?? day.temp
          const tMax   = day.temp_max ?? day.temp
          const cond   = weatherCondition(null, day.precipitation)

          // Bar position relative to overall dataset range
          const left  = ((tMin - allMin) / range) * 100
          const width = Math.max(4, ((tMax - tMin) / range) * 100)

          return (
            <div key={day.dt} className={styles.row}>
              <span className={styles.day}>{dayName} {dateNum}</span>
              <span className={styles.symbol} aria-hidden="true">{cond.symbol}</span>
              <div className={styles.barWrap} aria-hidden="true">
                <div
                  className={styles.bar}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              <div className={styles.temps}>
                <span className={styles.tMax}>{formatTemp(tMax, settings.tempUnit)}</span>
                <span className={styles.tMin}>{formatTemp(tMin, settings.tempUnit)}</span>
                {day.precipitation > 0 && (
                  <span className={styles.precip}>{day.precipitation.toFixed(1)} mm</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
