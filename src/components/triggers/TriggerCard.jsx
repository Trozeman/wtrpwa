import { useState } from 'react'
import { conditionSummary } from './triggerMeta.js'
import { timeAgo } from '../../lib/format.js'
import styles from './TriggerCard.module.css'

export default function TriggerCard({ trigger, onToggle, onEdit, onDelete, onTest }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [testState, setTestState]         = useState(null)  // null | 'sending' | 'sent' | 'blocked'

  async function handleTest() {
    if (testState) return
    setTestState('sending')
    const result = await onTest(trigger)
    setTestState(result)
    setTimeout(() => setTestState(null), 2500)
  }

  const testLabel = testState === 'sending' ? '…'
    : testState === 'sent'    ? 'Sent ✓'
    : testState === 'blocked' ? 'Blocked'
    : '🔔 Test'

  return (
    <div className={`${styles.card} ${!trigger.enabled ? styles.disabled : ''}`}>
      {/* ── Name + toggle ── */}
      <div className={styles.topRow}>
        {trigger.icon && <span className={styles.triggerIcon} aria-hidden="true">{trigger.icon}</span>}
        <span className={styles.name}>{trigger.name || 'Untitled trigger'}</span>
        <label className={styles.toggle} aria-label={`${trigger.enabled ? 'Disable' : 'Enable'} ${trigger.name}`}>
          <input
            type="checkbox"
            checked={trigger.enabled}
            onChange={() => onToggle(trigger.id)}
          />
          <span className={styles.toggleTrack} />
          <span className={styles.toggleThumb} />
        </label>
      </div>

      {/* ── Condition summary ── */}
      <div className={styles.condition}>{conditionSummary(trigger.condition)}</div>

      {/* ── Template preview ── */}
      <div className={styles.template} title={trigger.template}>
        "{trigger.template}"
      </div>

      {/* ── Last fired ── */}
      {trigger.lastFiredAt && (
        <div className={styles.fired}>
          Last fired {timeAgo(trigger.lastFiredAt)}
        </div>
      )}

      {/* ── Actions ── */}
      {!confirmDelete ? (
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnTest} ${testState === 'sent' ? styles.btnTestSent : ''} ${testState === 'blocked' ? styles.btnTestBlocked : ''}`}
            onClick={handleTest}
            disabled={testState === 'sending'}
            aria-label={`Test notification for ${trigger.name}`}
          >
            {testLabel}
          </button>
          <span className={styles.spacer} />
          <button className={`${styles.btn} ${styles.btnEdit}`} onClick={() => onEdit(trigger)}>
            Edit
          </button>
          <button className={`${styles.btn} ${styles.btnDelete}`} onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        </div>
      ) : (
        <div className={styles.deleteConfirm}>
          <span className={styles.deleteConfirmLabel}>Delete this trigger?</span>
          <button className={styles.btnCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
          <button className={styles.btnConfirm} onClick={() => onDelete(trigger.id)}>Delete</button>
        </div>
      )}
    </div>
  )
}
