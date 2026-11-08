import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Mosaicos de OpenStreetMap (sin clave). En tema oscuro se invierten por CSS (.mapa--dark).
const TILES = { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }

// Pin naranja con el corte diagonal de la marca (sin imágenes externas)
const pin = L.divIcon({
  className: 'fv-pin',
  html: '<svg viewBox="0 0 32 44" width="32" height="44" aria-hidden="true"><path d="M16 0C7 0 0 7 0 16c0 11 16 28 16 28s16-17 16-28C32 7 25 0 16 0z" fill="#f26a1b"/><path d="M9 11h14l-4 11h-6z" fill="#fff"/></svg>',
  iconSize: [32, 44], iconAnchor: [16, 44], popupAnchor: [0, -40],
})

/** Mapa de ubicación. Cambia los mosaicos (claro/oscuro) siguiendo el tema del sitio. */
export default function MapView({ lat, lng, zoom = 16, title, address, height = 380 }) {
  const el = useRef(null)
  useEffect(() => {
    if (!el.current || lat == null || lng == null) return
    const map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([lat, lng], zoom)
    L.tileLayer(TILES.url, { attribution: TILES.attr, maxZoom: 19 }).addTo(map)
    const setTheme = () => el.current?.classList.toggle('mapa--dark', document.documentElement.dataset.theme === 'dark')
    setTheme()
    const obs = new MutationObserver(setTheme)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    L.marker([lat, lng], { icon: pin }).addTo(map)
      .bindPopup(`<strong>${title || 'Ferre Vertikal G&L'}</strong><br>${address || ''}`)
      .openPopup()
    return () => { obs.disconnect(); map.remove() }
  }, [lat, lng, zoom, title, address])
  return <div ref={el} className="mapa" style={{ height }} role="region" aria-label="Mapa de ubicación" />
}
