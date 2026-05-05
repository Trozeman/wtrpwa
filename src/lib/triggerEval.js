// Pure evaluation logic shared between useTriggerEngine (main thread) and sw.js (background sync).

export function getObserved(metric, weather) {
  const current    = weather.current    ?? {}
  const forecast   = weather.forecast   ?? []
  const daily      = weather.daily      ?? []
  const latestHour = forecast[forecast.length - 1] ?? current
  const latestDay  = daily[daily.length - 1]        ?? {}

  switch (metric) {
    case 'rain_probability':
      return (latestHour.pop ?? 0) * 100

    case 'temp_min':
      return latestDay.temp_min ?? current.temp ?? null

    case 'temp_max':
      return latestDay.temp_max ?? current.temp ?? null

    case 'wind_speed':
      return current.wind_speed != null ? current.wind_speed * 3.6 : null

    case 'humidity':
      return current.humidity ?? null

    default:
      return null
  }
}

export function evaluate(condition, weather) {
  const observed = getObserved(condition.metric, weather)
  if (observed == null) return false
  const { operator, value } = condition
  if (operator === 'gte') return observed >= value
  if (operator === 'lte') return observed <= value
  if (operator === 'eq')  return Math.abs(observed - value) < 0.5
  return false
}
