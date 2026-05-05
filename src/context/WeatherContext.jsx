import { createContext, useContext, useState } from 'react'
import { loadRaw, saveRaw } from '../lib/storage.js'

const Ctx = createContext(null)

export function WeatherProvider({ children }) {
  const [weather, setWeatherState] = useState(() => loadRaw('CACHE'))
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const setWeather = (data) => {
    const stamped = { ...data, fetchedAt: Date.now() }
    saveRaw('CACHE', stamped)
    setWeatherState(stamped)
    setError(null)
    window.dispatchEvent(new CustomEvent('weather:updated', { detail: stamped }))
  }

  return (
    <Ctx.Provider value={{ weather, setWeather, error, setError, loading, setLoading }}>
      {children}
    </Ctx.Provider>
  )
}

export const useWeather = () => useContext(Ctx)
