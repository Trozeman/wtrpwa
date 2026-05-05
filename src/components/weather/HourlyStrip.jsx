import { useRef, useEffect, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatTemp, formatHour } from '../../lib/format.js'
import { weatherCondition } from '../../lib/weather.js'
import styles from './HourlyStrip.module.css'

const SLOTS = 24

export default function HourlyStrip({ hours }) {
  const { settings } = useSettings()
  const scrollRef = useRef(null)
  const nowRef    = useRef(null)

  const slots = (hours ?? []).slice(-SLOTS)

  const [nowHour, setNowHour] = useState(() => new Date().getHours())

  useEffect(() => {
    const id = setInterval(() => setNowHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  const nowDt   = [...slots].reverse().find(
    h => new Date(h.dt * 1000).getHours() === nowHour
  )?.dt ?? null

  // Scroll "now" slot into view on mount; fall back to rightmost
  useEffect(() => {
    if (nowRef.current) {
      nowRef.current.scrollIntoView({ inline: 'center', block: 'nearest' })
    } else if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [slots.length])

  if (!slots.length) return null

  return (
    <div className={styles.section}>
      <p className={styles.sectionHeader}>24 h overview</p>
      <div className={styles.scroll} ref={scrollRef}>
        {slots.map(h => {
          const label     = formatHour(h.dt, settings.dateFormat)
          const cond      = weatherCondition(h.cloudiness, h.precipitation)
          const isNow     = h.dt === nowDt

          return (
            <div
              key={h.dt}
              ref={isNow ? nowRef : null}
              className={`${styles.card} ${isNow ? styles.now : ''}`}
              aria-label={`${label}${isNow ? ' (current hour)' : ''} ${cond.label} ${formatTemp(h.temp, settings.tempUnit)}`}
            >
              <span className={styles.time}>{label}</span>
              {isNow && <span className={styles.nowBadge} aria-hidden="true">NOW</span>}
              <span className={styles.symbol} aria-hidden="true">{cond.symbol}</span>
              <span className={styles.temp}>{formatTemp(h.temp, settings.tempUnit)}</span>
              {h.precipitation > 0.01 && (
                <span className={styles.precip}>{h.precipitation.toFixed(1)} mm</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
