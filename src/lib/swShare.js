// Bridge between localStorage (main thread) and the SW (no localStorage access).
// Data is stored in the Cache API which is readable from both contexts.

const SHARED_CACHE = 'wtr-shared-v1'
const CONFIG_KEY   = '/_wtr/config'

export async function writeSWConfig({ location, triggers, settings }) {
  try {
    const cache = await caches.open(SHARED_CACHE)
    await cache.put(
      CONFIG_KEY,
      new Response(JSON.stringify({ location, triggers, settings }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  } catch {}
}

export async function readSWConfig() {
  try {
    const cache = await caches.open(SHARED_CACHE)
    const res   = await cache.match(CONFIG_KEY)
    return res ? res.json() : null
  } catch { return null }
}

// Merge lastFiredAt timestamps written by the SW back into the local trigger array.
// Prevents re-firing triggers the SW already handled while the app was closed.
export async function mergeSWCooldowns(localTriggers) {
  try {
    const cfg = await readSWConfig()
    if (!cfg?.triggers?.length) return localTriggers
    const map = Object.fromEntries(cfg.triggers.map(t => [t.id, t.lastFiredAt ?? 0]))
    return localTriggers.map(t => {
      const swTs = map[t.id] ?? 0
      const localTs = t.lastFiredAt ?? 0
      return swTs > localTs ? { ...t, lastFiredAt: swTs } : t
    })
  } catch { return localTriggers }
}
