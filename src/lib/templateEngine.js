import { formatTemp, formatDate, formatWindSpeed } from './format.js'

// Template variables:
//   @  temperature (in user's unit)
//   $  wind speed  (km/h)
//   %  humidity    (%)
//   &  latest data timestamp (formatted per dateFormat setting)
//
// NASA POWER data shape used:
//   weather.current.{ temp, humidity, wind_speed (m/s), dt (unix s) }

export function resolveTemplate(template, weather, settings = {}) {
  const current = weather.current ?? {}
  const { tempUnit = 'C', dateFormat = 'DD.MM.YYYY HH:mm' } = settings

  const temp      = formatTemp(current.temp, tempUnit)
  const wind      = formatWindSpeed(current.wind_speed)   // m/s → km/h string
  const humidity  = current.humidity != null ? `${Math.round(current.humidity)}` : '?'
  const eventTime = current.dt ? formatDate(current.dt * 1000, dateFormat) : '?'

  return template
    .replace(/@/g, temp)
    .replace(/\$/g, `${wind} km/h`)
    .replace(/%/g, `${humidity}%`)
    .replace(/&/g, eventTime)
}
