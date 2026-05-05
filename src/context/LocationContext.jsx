import { createContext, useContext, useState } from 'react'
import { loadRaw, saveRaw } from '../lib/storage.js'

const Ctx = createContext(null)

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(() => loadRaw('LOCATION'))

  const setLocation = (loc) => {
    const stamped = { ...loc, updatedAt: Date.now() }
    saveRaw('LOCATION', stamped)
    setLocationState(stamped)
  }

  const clearLocation = () => {
    localStorage.removeItem('wtr_location')
    setLocationState(null)
  }

  return (
    <Ctx.Provider value={{ location, setLocation, clearLocation }}>
      {children}
    </Ctx.Provider>
  )
}

export const useLocation = () => useContext(Ctx)
