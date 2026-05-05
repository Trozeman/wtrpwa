import { Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { LocationProvider } from './context/LocationContext.jsx'
import { WeatherProvider } from './context/WeatherContext.jsx'
import AppShell from './components/layout/AppShell.jsx'
import LocationGate from './components/location/LocationGate.jsx'
import WeatherPage from './pages/WeatherPage.jsx'
import TriggersPage from './pages/TriggersPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import { useGeolocationPoller } from './hooks/useGeolocationPoller.js'
import { useWeatherPoller } from './hooks/useWeatherPoller.js'
import { useTriggerEngine } from './hooks/useTriggerEngine.js'

function Inner() {
  useGeolocationPoller()
  useWeatherPoller()
  useTriggerEngine()
  return (
    <LocationGate>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/weather" replace />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/triggers" element={<TriggersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </LocationGate>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <LocationProvider>
        <WeatherProvider>
          <Inner />
        </WeatherProvider>
      </LocationProvider>
    </SettingsProvider>
  )
}
