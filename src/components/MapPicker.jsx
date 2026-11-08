import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from './Icons'

const TILES = { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }
const pin = L.divIcon({
  className: 'fv-pin',
  html: '<svg viewBox="0 0 32 44" width="32" height="44" aria-hidden="true"><path d="M16 0C7 0 0 7 0 16c0 11 16 28 16 28s16-17 16-28C32 7 25 0 16 0z" fill="#f26a1b"/><path d="M9 11h14l-4 11h-6z" fill="#fff"/></svg>',
  iconSize: [32, 44], iconAnchor: [16, 44],
})

/** Mapa para que el cliente marque dónde quiere la entrega: toca el mapa o arrastra el pin.
 *  `value` = { lat, lng } | null · `onChange(value)` · `center` = ubicación de la tienda. */
export default function MapPicker({ value, onChange, center = { lat: -3.96285, lng: -79.21454 }, height = 300 }) {
  const el = useRef(null), map = useRef(null), marker = useRef(null)
  const [locating, setLocating] = useState(false)
  const [err, setErr] = useState(null)

  const place = (lat, lng, fly) => {
    if (!map.current) return
    if (!marker.current) {
      marker.current = L.marker([lat, lng], { icon: pin, draggable: true, keyboard: true }).addTo(map.current)
      marker.current.on('dragend', () => { const p = marker.current.getLatLng(); onChange({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }) })
    } else marker.current.setLatLng([lat, lng])
    if (fly) map.current.flyTo([lat, lng], Math.max(map.current.getZoom(), 16), { duration: 0.6 })
  }

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([value?.lat ?? center.lat, value?.lng ?? center.lng], value ? 16 : 14)
    L.tileLayer(TILES.url, { attribution: TILES.attr, maxZoom: 19 }).addTo(m)
    map.current = m
    const setTheme = () => el.current?.classList.toggle('mapa--dark', document.documentElement.dataset.theme === 'dark')
    setTheme()
    const obs = new MutationObserver(setTheme)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    m.on('click', (e) => { place(e.latlng.lat, e.latlng.lng); onChange({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }) })
    if (value) place(value.lat, value.lng)
    // Leaflet necesita recalcular el tamaño cuando el contenedor aparece dentro de un formulario
    setTimeout(() => m.invalidateSize(), 50)
    return () => { obs.disconnect(); m.remove(); map.current = null; marker.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const locate = () => {
    if (!navigator.geolocation) { setErr('Tu navegador no permite ubicarte. Toca el mapa para marcar el punto.'); return }
    setLocating(true); setErr(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude: lat, longitude: lng } = pos.coords; place(lat, lng, true); onChange({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) }); setLocating(false) },
      () => { setErr('No pudimos obtener tu ubicación. Toca el mapa para marcar el punto.'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="picker">
      <div className="picker__bar">
        <span>{value ? <><Icon name="check" size={16} /> Punto de entrega marcado</> : 'Toca el mapa donde quieres la entrega'}</span>
        <button type="button" className="btn btn--outline btn--sm" onClick={locate} disabled={locating}><Icon name="pin" size={16} /> {locating ? 'Ubicando…' : 'Usar mi ubicación'}</button>
      </div>
      <div ref={el} className="mapa picker__map" style={{ height }} role="application" aria-label="Mapa para marcar el punto de entrega" />
      {value && <small className="muted num">{value.lat}, {value.lng} · <a href={`https://www.google.com/maps?q=${value.lat},${value.lng}`} target="_blank" rel="noreferrer">ver en Google Maps</a></small>}
      {err && <small className="error">{err}</small>}
    </div>
  )
}
