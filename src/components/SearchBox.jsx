import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from './Icons'

/** Buscador del catálogo. Navega a /catalogo?q=… y la página de catálogo muestra los resultados con sus filtros. */
export default function SearchBox({ id, className = 'hsearch', placeholder = 'Buscar cemento, varilla, breaker…', onDone, buttonLabel }) {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const nav = useNavigate()
  const submit = (e) => { e.preventDefault(); nav(q.trim() ? `/catalogo?q=${encodeURIComponent(q.trim())}` : '/catalogo'); onDone?.() }
  return (
    <form className={className} role="search" onSubmit={submit}>
      <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Buscar en el catálogo" autoComplete="off" />
      <button type="submit" aria-label="Buscar"><Icon name="search" size={18} />{buttonLabel && <span>{buttonLabel}</span>}</button>
    </form>
  )
}
