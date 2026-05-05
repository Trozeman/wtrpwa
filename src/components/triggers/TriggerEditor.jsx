import { useState, useMemo } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useWeather } from '../../context/WeatherContext.jsx'
import { resolveTemplate } from '../../lib/templateEngine.js'
import {
  METRICS, OPERATORS, WINDOWS, TEMPLATE_VARS, TRIGGER_ICONS,
  metricMeta, BLANK_TRIGGER,
} from './triggerMeta.js'
import styles from './TriggerEditor.module.css'

const MOCK_WEATHER = {
  current: { temp: 18.5, humidity: 72, wind_speed: 4.2, dt: Math.floor(Date.now() / 1000) },
}

export default function TriggerEditor({ trigger, onSave, onClose }) {
  const { settings } = useSettings()
  const { weather } = useWeather()

  const initial = trigger
    ? { ...BLANK_TRIGGER, ...trigger, condition: { ...trigger.condition } }
    : { ...BLANK_TRIGGER, condition: { ...BLANK_TRIGGER.condition } }

  const [name,      setName]      = useState(initial.name)
  const [icon,      setIcon]      = useState(initial.icon ?? BLANK_TRIGGER.icon)
  const [condition, setCondition] = useState(initial.condition)
  const [template,  setTemplate]  = useState(initial.template)
  const [error,     setError]     = useState(null)

  const meta = metricMeta(condition.metric)

  function handleMetricChange(metric) {
    const m = metricMeta(metric)
    setCondition(c => ({ ...c, metric, operator: m.defaultOp, value: m.defaultVal }))
  }

  function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    if (condition.value === '' || condition.value == null) { setError('Value is required.'); return }

    onSave({
      id:          trigger?.id ?? crypto.randomUUID(),
      name:        name.trim(),
      icon,
      enabled:     trigger?.enabled ?? true,
      condition:   { ...condition, value: Number(condition.value) },
      template,
      lastFiredAt: trigger?.lastFiredAt ?? null,
    })
  }

  const previewBody = useMemo(() => {
    const w = weather?.current ? weather : MOCK_WEATHER
    return resolveTemplate(template || '…', w, settings)
  }, [template, weather, settings])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.sheet}>
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.header}>
          <span className={styles.title}>
            {trigger ? 'Edit trigger' : 'New trigger'}
          </span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={styles.body}>
          {/* ── Icon picker ── */}
          <div className={styles.group}>
            <label className={styles.label}>Icon</label>
            <div className={styles.iconGrid}>
              {TRIGGER_ICONS.map(e => (
                <button
                  key={e}
                  type="button"
                  className={`${styles.iconBtn} ${icon === e ? styles.iconBtnActive : ''}`}
                  onClick={() => setIcon(e)}
                  aria-label={e}
                  aria-pressed={icon === e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* ── Name ── */}
          <div className={styles.group}>
            <label className={styles.label} htmlFor="trig-name">Trigger name</label>
            <input
              id="trig-name"
              className={styles.input}
              type="text"
              placeholder="e.g. Freezing wind"
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
              maxLength={60}
            />
          </div>

          {/* ── Metric ── */}
          <div className={styles.group}>
            <label className={styles.label} htmlFor="trig-metric">What to watch</label>
            <select
              id="trig-metric"
              className={styles.select}
              value={condition.metric}
              onChange={e => handleMetricChange(e.target.value)}
            >
              {METRICS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* ── Operator + value + unit ── */}
          <div className={styles.group}>
            <label className={styles.label}>Fire when value is</label>
            <div className={styles.condRow}>
              <select
                className={styles.select}
                value={condition.operator}
                onChange={e => setCondition(c => ({ ...c, operator: e.target.value }))}
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <input
                className={styles.valueInput}
                type="number"
                value={condition.value}
                min={meta.min}
                max={meta.max}
                step={meta.step}
                onChange={e => setCondition(c => ({ ...c, value: e.target.value }))}
              />
              <div className={styles.unit}>{meta.unit}</div>
            </div>
          </div>

          {/* ── Window ── */}
          <div className={styles.group}>
            <label className={styles.label} htmlFor="trig-window">Time window</label>
            <select
              id="trig-window"
              className={styles.select}
              value={condition.window}
              onChange={e => setCondition(c => ({ ...c, window: e.target.value }))}
            >
              {WINDOWS.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>

          {/* ── Template ── */}
          <div className={styles.group}>
            <label className={styles.label} htmlFor="trig-template">Notification text</label>
            <textarea
              id="trig-template"
              className={styles.textarea}
              value={template}
              onChange={e => setTemplate(e.target.value)}
              placeholder="Use @, $, %, & for dynamic values"
              rows={3}
            />
            <div className={styles.legend}>
              {TEMPLATE_VARS.map(({ symbol, desc }) => (
                <span key={symbol} className={styles.varChip}>
                  <span className={styles.varSymbol}>{symbol}</span>
                  {desc}
                </span>
              ))}
            </div>
          </div>

          {/* ── Live preview ── */}
          <div className={styles.preview}>
            <div className={styles.previewLabel}>Notification preview</div>
            <div className={styles.previewTitle}>
              {icon && <span className={styles.previewIcon}>{icon}</span>}
              {name.trim() || 'Trigger name'}
            </div>
            <div className={styles.previewBody}>{previewBody}</div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnSave} onClick={handleSave}>Save trigger</button>
        </div>
      </div>
    </div>
  )
}
