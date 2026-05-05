import { useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatTemp, formatHour, formatTime } from '../../lib/format.js'
import { weatherCondition } from '../../lib/weather.js'
import styles from './DailyForecast.module.css'

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function DailyForecast({ days, allHourly }) {
  const { settings } = useSettings()
  const [expandedDt, setExpandedDt] = useState(null)

  if (!days?.length) return null

  const allMin = Math.min(...days.map(d => d.temp_min ?? d.temp ?? 0))
  const allMax = Math.max(...days.map(d => d.temp_max ?? d.temp ?? 0))
  const range  = allMax - allMin || 1

  return (
    <div className={styles.section}>
      <p className={styles.sectionHeader}>7-day forecast</p>
      <div className={styles.list}>
        {days.map(day => {
          const date      = new Date(day.dt * 1000)
          const dayName   = DAY_NAMES[date.getDay()]
          const dateNum   = date.getDate()
          const tMin      = day.temp_min ?? day.temp
          const tMax      = day.temp_max ?? day.temp
          const cond      = weatherCondition(null, day.precipitation)
          const isOpen    = expandedDt === day.dt

          const left  = ((tMin - allMin) / range) * 100
          const width = Math.max(4, ((tMax - tMin) / range) * 100)

          // Hours belonging to this calendar day
          const dayStr   = date.toDateString()
          const dayHours = (allHourly ?? []).filter(
            h => new Date(h.dt * 1000).toDateString() === dayStr
          )

          return (
            <div key={day.dt} className={styles.item}>
              {/* ── Clickable summary row ── */}
              <button
                className={`${styles.row} ${isOpen ? styles.rowOpen : ''}`}
                onClick={() => setExpandedDt(isOpen ? null : day.dt)}
                aria-expanded={isOpen}
              >
                <span className={styles.day}>{dayName} {dateNum}</span>
                <span className={styles.symbol} aria-hidden="true">{cond.symbol}</span>
                <div className={styles.barWrap} aria-hidden="true">
                  <div className={styles.bar} style={{ left: `${left}%`, width: `${width}%` }} />
                </div>
                <div className={styles.temps}>
                  <span className={styles.tMax}>{formatTemp(tMax, settings.tempUnit)}</span>
                  <span className={styles.tMin}>{formatTemp(tMin, settings.tempUnit)}</span>
                  {day.precipitation > 0 && (
                    <span className={styles.precip}>{day.precipitation.toFixed(1)} mm</span>
                  )}
                </div>
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">›</span>
              </button>

              {/* ── Expandable detail panel ── */}
              <div className={`${styles.detail} ${isOpen ? styles.detailOpen : ''}`}>
                <div className={styles.detailInner}>

                  {/* Stats row */}
                  <div className={styles.stats}>
                    {day.pop != null && (
                      <div className={styles.stat}>
                        <span className={styles.statIcon}>🌂</span>
                        <span className={styles.statVal}>{Math.round(day.pop * 100)}%</span>
                        <span className={styles.statLbl}>rain chance</span>
                      </div>
                    )}
                    {day.sunrise != null && (
                      <div className={styles.stat}>
                        <span className={styles.statIcon}>🌅</span>
                        <span className={styles.statVal}>{formatTime(day.sunrise, settings.dateFormat)}</span>
                        <span className={styles.statLbl}>sunrise</span>
                      </div>
                    )}
                    {day.sunset != null && (
                      <div className={styles.stat}>
                        <span className={styles.statIcon}>🌇</span>
                        <span className={styles.statVal}>{formatTime(day.sunset, settings.dateFormat)}</span>
                        <span className={styles.statLbl}>sunset</span>
                      </div>
                    )}
                  </div>

                  {/* Hourly mini strip */}
                  {dayHours.length > 0 && (
                    <div className={styles.hourScroll}>
                      {dayHours.map(h => {
                        const hCond = weatherCondition(h.cloudiness, h.precipitation)
                        return (
                          <div key={h.dt} className={styles.hourCard}>
                            <span className={styles.hourTime}>{formatHour(h.dt, settings.dateFormat)}</span>
                            <span className={styles.hourSymbol} aria-hidden="true">{hCond.symbol}</span>
                            <span className={styles.hourTemp}>{formatTemp(h.temp, settings.tempUnit)}</span>
                            {h.pop > 0.1 && (
                              <span className={styles.hourPop}>{Math.round(h.pop * 100)}%</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
