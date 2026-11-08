import { useEffect } from 'react'
import { gsap } from '../hooks/useGsap'
import Icon from './Icons'

/** Visor de imágenes a pantalla completa. items: [{ src, alt, t, d }] */
export default function Lightbox({ items = [], index = 0, onClose, onIndex = () => {} }) {
  const it = items[index]
  const n = items.length
  const go = (d) => onIndex((index + d + n) % n)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [index, n]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo('.lb figure', { scale: 0.94, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'power3.out' })
  }, [index])
  if (!it) return null
  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label={it.t || it.alt || 'Imagen ampliada'} onClick={onClose}>
      <button type="button" className="lb__x" onClick={onClose} aria-label="Cerrar">×</button>
      {n > 1 && <button type="button" className="lb__nav lb__prev" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Anterior"><Icon name="prev" /></button>}
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={it.src} alt={it.alt || it.t || ''} />
        {(it.t || it.d) && <figcaption><strong>{it.t}</strong>{it.d && <span>{it.d}</span>}</figcaption>}
      </figure>
      {n > 1 && <button type="button" className="lb__nav lb__next" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Siguiente"><Icon name="next" /></button>}
      {n > 1 && <span className="lb__n num">{index + 1} / {n}</span>}
    </div>
  )
}
