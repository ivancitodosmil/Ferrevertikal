import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
// En equipos lentos cada cuadro puede tardar; sin esto GSAP 'frena' el tiempo y las animaciones parecen congeladas.
gsap.ticker.lagSmoothing(0)
export { gsap, ScrollTrigger }

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Revela los hijos `[data-reveal]` del contenedor al entrar en pantalla. */
export function useReveal(deps = []) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!ref.current || reduced()) return
    const items = ref.current.querySelectorAll('[data-reveal]')
    if (!items.length) return
    const ctx = gsap.context(() => {
      gsap.set(items, { y: 36, autoAlpha: 0 })
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true }),
        once: true,
      })
    }, ref)
    return () => ctx.revert()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}

/** Parallax suave para una imagen dentro de un contenedor con overflow hidden. */
export function useParallax(amount = 12) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!ref.current || reduced()) return
    const img = ref.current.querySelector('img')
    const ctx = gsap.context(() => {
      gsap.fromTo(img, { yPercent: -amount }, { yPercent: amount, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } })
    }, ref)
    return () => ctx.revert()
  }, [amount])
  return ref
}

/** Cuenta números desde 0 hasta data-count al entrar en pantalla. */
export function useCounters() {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || reduced()) return
    const els = ref.current.querySelectorAll('[data-count]')
    const ctx = gsap.context(() => {
      els.forEach((el) => {
        const end = Number(el.dataset.count), suffix = el.dataset.suffix || ''
        const obj = { v: 0 }
        gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('es-EC') + suffix } })
      })
    }, ref)
    return () => ctx.revert()
  }, [])
  return ref
}
