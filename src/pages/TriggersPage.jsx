import { useState, useCallback } from 'react'
import { loadTriggers, saveTriggers } from '../lib/storage.js'
import { resolveTemplate } from '../lib/templateEngine.js'
import { fireNotification } from '../lib/notifications.js'
import { useWeather } from '../context/WeatherContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import TriggerCard from '../components/triggers/TriggerCard.jsx'
import TriggerEditor from '../components/triggers/TriggerEditor.jsx'
import styles from './TriggersPage.module.css'

const MOCK_WEATHER = {
  current: { temp: 18.5, humidity: 72, wind_speed: 4.2, dt: Math.floor(Date.now() / 1000) },
}

export default function TriggersPage() {
  const [triggers, setTriggers] = useState(() => loadTriggers())
  const [editing, setEditing] = useState(null)   // null=closed, false=new, obj=edit
  const { weather } = useWeather()
  const { settings } = useSettings()

  const persist = useCallback(updated => {
    saveTriggers(updated)
    setTriggers(updated)
  }, [])

  function handleToggle(id) {
    persist(triggers.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t))
  }

  function handleDelete(id) {
    persist(triggers.filter(t => t.id !== id))
  }

  function handleSave(saved) {
    const exists = triggers.some(t => t.id === saved.id)
    persist(exists
      ? triggers.map(t => t.id === saved.id ? saved : t)
      : [...triggers, saved]
    )
    setEditing(null)
  }

  async function handleTest(trigger) {
    if (typeof Notification === 'undefined') return 'blocked'
    if (Notification.permission === 'denied') return 'blocked'
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission()
      if (p !== 'granted') return 'blocked'
    }
    const w = weather?.current ? weather : MOCK_WEATHER
    const body = resolveTemplate(trigger.template, w, settings)
    await fireNotification(trigger.name, body, trigger.icon ?? '')
    return 'sent'
  }

  const notifDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Triggers</h1>
        <button className={styles.addBtn} onClick={() => setEditing(false)}>
          + New
        </button>
      </div>

      {notifDenied && (
        <div className={styles.permBanner}>
          Notifications are blocked — enable them in browser settings for triggers to fire.
        </div>
      )}

      <p className={styles.note}>
        Triggers fire local notifications when a condition is met on the next weather refresh.
        NASA POWER data has a ~48–72 h delay — triggers evaluate against the most recent available values.
      </p>

      {triggers.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔔</div>
          <div className={styles.emptyText}>No triggers yet</div>
          <div className={styles.emptyHint}>Tap "+ New" to create your first weather alert</div>
        </div>
      ) : (
        <div className={styles.list}>
          {triggers.map(t => (
            <TriggerCard
              key={t.id}
              trigger={t}
              onToggle={handleToggle}
              onEdit={setEditing}
              onDelete={handleDelete}
              onTest={handleTest}
            />
          ))}
        </div>
      )}

      {editing !== null && (
        <TriggerEditor
          trigger={editing || null}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
