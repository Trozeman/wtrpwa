export function formatTemp(celsius, unit = 'C') {
  if (celsius == null) return '?'
  const n = Number(celsius)
  if (unit === 'F') return `${((n * 9) / 5 + 32).toFixed(1)}°F`
  if (unit === 'K') return `${(n + 273.15).toFixed(1)} K`
  return `${n.toFixed(1)}°C`
}

export function formatDate(ts, fmt = 'DD.MM.YYYY HH:mm') {
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  const tokens = {
    YYYY: String(d.getFullYear()),
    MM:   pad(d.getMonth() + 1),
    DD:   pad(d.getDate()),
    HH:   pad(d.getHours()),
    hh:   pad(d.getHours() % 12 || 12),
    mm:   pad(d.getMinutes()),
    a:    d.getHours() < 12 ? 'am' : 'pm',
  }
  return fmt.replace(/YYYY|MM|DD|HH|hh|mm|a/g, m => tokens[m])
}

// Format a unix-seconds timestamp as a short hour string,
// respecting 12h vs 24h based on the active dateFormat.
export function formatHour(dtSec, dateFormat = 'DD.MM.YYYY HH:mm') {
  const d = new Date(dtSec * 1000)
  if (/hh/.test(dateFormat)) {
    const h = d.getHours() % 12 || 12
    return `${h}${d.getHours() < 12 ? 'am' : 'pm'}`
  }
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

export function formatWindSpeed(ms) {
  if (ms == null) return '?'
  return `${(ms * 3.6).toFixed(1)}`
}

export function timeAgo(ts) {
  if (!ts) return null
  const diffMs = Date.now() - ts
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return `${Math.floor(hrs / 24)} d ago`
}
