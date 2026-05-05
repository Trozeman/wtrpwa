import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLocation } from '../../context/LocationContext.jsx'
import { reverseGeocode, ipGeolocate } from '../../lib/api.js'
import styles from './MapPicker.module.css'

// Fix Leaflet's bundler icon path issue
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const DEFAULT_CENTER = [48.5, 32.0] // center of Ukraine
const DEFAULT_ZOOM = 6

export default function MapPicker({ onSelect }) {
  const { setLocation } = useLocation()

  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  const [markerPos, setMarkerPos] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Try IP geolocation for initial centre, fallback to Ukraine
    ipGeolocate()
      .then(({ lat, lon }) => {
        map.setView([lat, lon], 10)
        placeMarker(map, [lat, lon])
      })
      .catch(() => {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      })

    map.on('click', (e) => {
      placeMarker(map, [e.latlng.lat, e.latlng.lng])
    })

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  function placeMarker(map, latlng) {
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng)
    } else {
      markerRef.current = L.marker(latlng, { draggable: true }).addTo(map)
      markerRef.current.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng()
        setMarkerPos([lat, lng])
      })
    }
    setMarkerPos(latlng)
    setError(null)
  }

  async function handleConfirm() {
    if (!markerPos) return
    setConfirming(true)
    setError(null)
    const [lat, lon] = markerPos
    try {
      const results = await reverseGeocode(lat, lon)
      const { name = null, country = null } = results[0] ?? {}
      setLocation({ lat, lon, name, country, source: 'manual' })
      onSelect?.()
    } catch (e) {
      setError('Could not get location name — try again or use city search.')
      setConfirming(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.mapContainer} ref={containerRef} />

      <div className={styles.footer}>
        {markerPos ? (
          <span className={styles.coords}>
            {markerPos[0].toFixed(5)}, {markerPos[1].toFixed(5)}
          </span>
        ) : (
          <span className={styles.coords}>Tap the map to drop a pin</span>
        )}

        {error && <span className={styles.error}>{error}</span>}

        {confirming
          ? <div className={styles.spinner} aria-label="Loading…" />
          : (
            <button
              className={styles.btn}
              onClick={handleConfirm}
              disabled={!markerPos}
            >
              Use this location
            </button>
          )
        }
      </div>
    </div>
  )
}
