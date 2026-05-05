import { createContext, useContext, useState, useCallback } from 'react'
import { loadSettings, saveRaw } from '../lib/storage.js'

const Ctx = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveRaw('SETTINGS', next)
      return next
    })
  }, [])

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>
}

export const useSettings = () => useContext(Ctx)
