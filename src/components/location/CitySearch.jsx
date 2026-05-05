import { useState, useEffect, useRef } from 'react'
import { useLocation } from '../../context/LocationContext.jsx'
import { geocodeCity } from '../../lib/api.js'
import styles from './CitySearch.module.css'

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌍'
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1f1e6 - 65 + c.charCodeAt(0))
  )
}

export default function CitySearch() {
  const { setLocation } = useLocation()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | empty | error | done
  const debounceRef = useRef(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); setStatus('idle'); return }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setStatus('loading')
      try {
        const data = await geocodeCity(q)
        if (data.length === 0) { setStatus('empty'); return }
        setResults(data)
        setStatus('done')
      } catch (e) {
        setStatus('error')
        console.warn('Geocode failed', e)
      }
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleSelect(item) {
    setLocation({
      lat: item.lat,
      lon: item.lon,
      name: item.name,
      country: item.country,
      source: 'manual',
    })
  }

  return (
    <div className={styles.root}>
      <div className={styles.inputWrap}>
        <SearchIcon className={styles.searchIcon} />
        <input
          className={styles.input}
          type="search"
          placeholder="Search city, e.g. Dubno…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {status === 'loading' && <div className={styles.spinner} role="status" aria-label="Searching…" />}
      {status === 'empty'   && <p className={styles.hint}>No results for &ldquo;{query}&rdquo;</p>}
      {status === 'error'   && <p className={styles.error}>Search failed — check your connection and try again.</p>}
      {status === 'idle' && !query && <p className={styles.hint}>Type a city name to search via OpenStreetMap</p>}

      {status === 'done' && (
        <ul className={styles.results} role="listbox" aria-label="Search results">
          {results.map((item, i) => (
            <li key={`${item.lat}-${item.lon}-${i}`}>
              <button
                className={styles.result}
                role="option"
                aria-selected="false"
                onClick={() => handleSelect(item)}
              >
                <span className={styles.flag} aria-hidden="true">
                  {countryFlag(item.country)}
                </span>
                <span>
                  <div className={styles.cityName}>{item.name}</div>
                  <div className={styles.cityMeta}>
                    {[item.state, item.country].filter(Boolean).join(', ')}
                    {' · '}
                    {item.lat.toFixed(3)}, {item.lon.toFixed(3)}
                  </div>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
