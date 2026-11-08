import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap, ScrollTrigger, useReveal, useParallax, useCounters } from '../hooks/useGsap'
import { useAsync } from '../hooks/useAsync'
import { listCategories, listProducts, listActivePromotions } from '../services/catalog'
import { useSettings } from '../components/Layout'
import ProductCard from '../components/ProductCard'
import SearchBox from '../components/SearchBox'
import Icon from '../components/Icons'
import MapView from '../components/MapView'
import Lightbox from '../components/Lightbox'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Home() {
  const { home = {}, contact = {} } = useSettings()
  const cats = useAsync(listCategories, [])
  const featured = useAsync(() => listProducts({ featured: true, limit: 4 }), [])
  const all = useAsync(() => listProducts(), [])
  const promos = useAsync(listActivePromotions, [])
  const nPromo = (all.data || []).filter((p) => p.discount_pct > 0).length

  return (
    <>
      <Hero home={home} />
      <CategoryStrip cats={cats.data} />
      <Categories cats={cats.data} />
      <Featured products={featured.data} />
      <Marcas />
      <Bodega />
      <Delivery note={home.delivery_note} contact={contact} />
      <PromoTeaser n={nPromo} promo={(promos.data || [])[0]} />
      <Visit contact={contact} />
    </>
  )
}

const SLIDES = [
  { src: '/images/bodega-frente.jpg', cap: 'Bodega principal, materiales de obra' },
  { src: '/images/camion-carga.jpg', cap: 'Despacho directo a tu obra' },
  { src: '/images/bodega-hierro.jpg', cap: 'Hierro Adelca en stock' },
]

function Hero({ home }) {
  const ref = useRef(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(() => reduced())
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [paused])
  useEffect(() => {
    if (paused || reduced()) return
    const bar = ref.current?.querySelector('.hero__bar')
    if (bar) gsap.fromTo(bar, { width: '0%' }, { width: '100%', duration: 6, ease: 'none' })
  }, [i, paused])
  useEffect(() => {
    // Ken Burns: la foto activa hace un zoom lento mientras está en pantalla
    const img = ref.current?.querySelectorAll('.hero__img img')[i]
    if (!img || reduced()) return
    const tw = gsap.fromTo(img, { scale: 1.02 }, { scale: 1.1, duration: 7.5, ease: 'none' })
    return () => { tw.kill() }
  }, [i])
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced()) return
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.hero__band', { xPercent: 120, duration: 1.1, ease: 'power4.out' }, 0.1)
        .from('.hero h1 .l span', { yPercent: 110, duration: 0.9, stagger: 0.12 }, 0.4)
        .from('.hero p, .hero__cta', { y: 20, autoAlpha: 0, duration: 0.7, stagger: 0.12 }, 0.9)
        .from('.hero__facts div', { y: 14, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, 1.15)
    }, ref)
    return () => ctx.revert()
  }, [])
  const facts = useCounters()
  return (
    <section className="hero" ref={ref}>
      <div className="hero__img">
        {SLIDES.map((sl, n) => <img key={sl.src} src={sl.src} alt="" className={n === i ? 'on' : ''} />)}
      </div>
      <div className="hero__shade" />
      <div className="hero__band" aria-hidden="true" />
      <div className="wrap">
        <h1>
          <span className="l"><span>Todo para tu obra,</span></span>
          <span className="l"><span>en <em>un solo lugar.</em></span></span>
        </h1>
        <p>{home.tagline || 'Tu proyecto, nuestro compromiso'}. Cemento, hierro, cubiertas, tubería, eléctricos y herramientas con stock real en bodega. Compra en línea y te lo llevamos a la obra.</p>
        <div className="hero__cta">
          <SearchBox id="buscar-hero" className="hero__buscar" placeholder="¿Qué necesitas? Ej. cemento, varilla 12 mm, breaker" buttonLabel="Buscar" />
          <Link to="/catalogo" className="link link--claro">Ver todo el catálogo</Link>
        </div>
        <div className="hero__facts" ref={facts}>
          <div><strong className="num" data-count="8">8</strong><span>categorías de productos</span></div>
          <div><strong className="num" data-count="500" data-suffix="+">500+</strong><span>productos en stock</span></div>
          <div><strong className="num" data-count="24" data-suffix=" h">24 h</strong><span>entrega en obra</span></div>
        </div>
      </div>
      <span className="hero__cap">{SLIDES[i].cap}</span>
      <div className="hero__ctl" aria-label="Controles de fotos">
        <button onClick={() => setI((n) => (n - 1 + SLIDES.length) % SLIDES.length)} aria-label="Foto anterior"><Icon name="prev" size={16} /></button>
        <span className="num">{String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}</span>
        <button onClick={() => setI((n) => (n + 1) % SLIDES.length)} aria-label="Siguiente foto"><Icon name="next" size={16} /></button>
        <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Reanudar' : 'Pausar'}><Icon name={paused ? 'play' : 'pause'} size={16} /></button>
      </div>
      <div className="hero__bar" aria-hidden="true" />
    </section>
  )
}

/* Franja de accesos rápidos al catálogo (reemplaza la marquesina) */
function CategoryStrip({ cats }) {
  return (
    <div className="strip">
      <div className="wrap">
        <span className="strip__t">Ir directo a:</span>
        <div className="chips">
          {(cats || []).map((c) => <Link key={c.id} to={`/catalogo/${c.slug}`}>{c.name}</Link>)}
          <Link to="/promociones" className="chips__promo">Promociones</Link>
        </div>
      </div>
    </div>
  )
}

function Categories({ cats }) {
  const ref = useReveal([cats])
  return (
    <section className="section" ref={ref}>
      <div className="wrap">
        <div className="titulo">
          <div className="titulo__row" data-reveal><h2>Busca por categoría</h2><Link to="/catalogo" className="link">Ver todo el catálogo</Link></div>
          <p className="titulo__lead" data-reveal>Ocho secciones, igual que en la bodega. Entra a la que necesitas y agrega productos al carrito.</p>
        </div>
        <div className="cats">
          {(cats || []).map((c) => (
            <Link key={c.id} to={`/catalogo/${c.slug}`} className="cat" data-reveal>
              <Icon name={c.icon || 'materiales'} size={36} />
              <strong>{c.name}</strong>
              <small>{c.description}</small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function Featured({ products }) {
  const ref = useReveal([products])
  return (
    <section className="section section--concreto" ref={ref}>
      <div className="wrap">
        <div className="titulo">
          <div className="titulo__row" data-reveal><h2>Los más pedidos</h2><Link to="/catalogo" className="link">Ver catálogo completo</Link></div>
          <p className="titulo__lead" data-reveal>Lo que más piden maestros y constructores esta semana. Precios por unidad de venta.</p>
        </div>
        <div className="grid grid--4">
          {(products || []).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </section>
  )
}

/* Marquesina de marcas: una sola línea en movimiento continuo */
const MARCAS = ['Adelca', 'Plastigama', 'Edesa', 'Cóndor', 'Siemens', 'Techolit', 'Orso', 'Wavin', 'Pegatanke']
function Marcas() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (reduced()) return
    const ctx = gsap.context(() => {
      const tw = gsap.to('.marcas__track', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 })
      const el = ref.current
      const slow = () => gsap.to(tw, { timeScale: 0.15, duration: 0.6 }), fast = () => gsap.to(tw, { timeScale: 1, duration: 0.6 })
      el.addEventListener('mouseenter', slow); el.addEventListener('mouseleave', fast)
      return () => { el.removeEventListener('mouseenter', slow); el.removeEventListener('mouseleave', fast) }
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <div className="marcas" ref={ref} aria-label="Marcas que trabajamos">
      <p className="marcas__t">Las marcas que pide tu maestro, en stock</p>
      <div className="marcas__track">
        {[...MARCAS, ...MARCAS].map((m, n) => <span key={n} aria-hidden={n >= MARCAS.length}>{m}</span>)}
      </div>
    </div>
  )
}

/* Mosaico de la bodega: fotos reales en mosaico, con revelado y parallax por pieza */
const FOTOS = [
  { k: 'a', src: '/images/bodega-frente.jpg', t: 'Bodega principal', d: 'Cemento, bloques y hierro listos para cargar en tu camioneta.', v: 5 },
  { k: 'b', src: '/images/bodega-tanques.jpg', t: 'Tanques y varilla', v: -8 },
  { k: 'c', src: '/images/pasillo-pinturas.jpg', t: 'Pinturas y acabados', v: 7 },
  { k: 'd', src: '/images/sanitarios.jpg', t: 'Sanitarios y grifería', v: -6 },
  { k: 'e', src: '/images/pasillo-electricos.jpg', t: 'Eléctricos y herramientas', v: 9 },
  { k: 'f', src: '/images/obra-entrega.jpg', t: 'Entrega en obra', d: 'Nuestros camiones descargan donde estás construyendo.', v: -5 },
  { k: 'g', src: '/images/camion-varillas.jpg', t: 'Carga directa', v: 8 },
]
function Bodega() {
  const ref = useRef(null)
  const [lb, setLb] = useState(null) // índice de la foto ampliada
  useLayoutEffect(() => {
    if (reduced()) return
    const ctx = gsap.context(() => {
      const tiles = gsap.utils.toArray('.foto')
      gsap.set('.titulo [data-reveal]', { y: 30, autoAlpha: 0 })
      gsap.to('.titulo [data-reveal]', { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true } })
      gsap.fromTo(tiles, { clipPath: 'inset(100% 0 0 0 round 12px)' }, { clipPath: 'inset(0% 0 0 0 round 12px)', duration: 1.1, ease: 'power4.out', stagger: 0.09, scrollTrigger: { trigger: '.bodega', start: 'top 82%', once: true } })
      gsap.fromTo('.foto img', { scale: 1.3 }, { scale: 1, duration: 1.4, ease: 'power3.out', stagger: 0.09, clearProps: 'transform', scrollTrigger: { trigger: '.bodega', start: 'top 82%', once: true } })
      const k = window.innerWidth < 760 ? 0.4 : 1 // en celular el parallax es más suave para que las piezas no se monten
      tiles.forEach((t) => {
        const v = (Number(t.dataset.v) || 0) * k
        gsap.fromTo(t, { yPercent: -v }, { yPercent: v, ease: 'none', scrollTrigger: { trigger: '.bodega', start: 'top bottom', end: 'bottom top', scrub: true } })
      })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="section" ref={ref} aria-label="Nuestra bodega">
      <div className="wrap">
        <div className="titulo">
          <div className="titulo__row" data-reveal><h2>Así es nuestra bodega</h2><Link to="/catalogo" className="link">Ver catálogo</Link></div>
          <p className="titulo__lead" data-reveal>Más de 500 productos en físico. Lo ves, lo cargas o te lo llevamos. Sin intermediarios.</p>
        </div>
        <div className="bodega">
          {FOTOS.map((f, n) => (
            <figure className={`foto foto--${f.k}`} key={f.src} data-v={f.v} onClick={() => setLb(n)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLb(n) } }} aria-label={`Ampliar foto: ${f.t}`}>
              <img src={f.src} alt={f.t} loading="lazy" />
              <figcaption className="foto__cap"><strong>{f.t}</strong>{f.d && <span>{f.d}</span>}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      {lb != null && <Lightbox items={FOTOS.map((f) => ({ src: f.src, t: f.t, d: f.d }))} index={lb} onIndex={setLb} onClose={() => setLb(null)} />}
    </section>
  )
}

function Delivery({ note, contact }) {
  const img = useParallax(10)
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (reduced()) return
    const ctx = gsap.context(() => {
      const sec = ref.current
      gsap.fromTo('.entrega__truck', { x: -90 }, { x: () => sec.clientWidth - 10, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 85%', end: 'bottom 15%', scrub: 0.8, invalidateOnRefresh: true } })
      const items = sec.querySelectorAll('.entrega__txt > *')
      gsap.set(items, { y: 34, autoAlpha: 0 })
      gsap.to(items, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: sec, start: 'top 70%', once: true } })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="section--carbon" ref={ref}>
      <div className="entrega">
        <div className="entrega__img" ref={img}><img src="/images/camion-carga.jpg" alt="Camión de Ferre Vertikal cargando varillas en bodega" /></div>
        <div className="entrega__txt">
          <h2>Te lo llevamos a la obra</h2>
          <p>{note || 'Entregamos en obra con nuestros camiones.'} Hierro, cemento, tejas y materiales pesados sin que tengas que moverte del proyecto.</p>
          <ol className="entrega__pasos">
            <li><b>1</b><span>Arma tu carrito en la web y paga con tarjeta o pide por WhatsApp.</span></li>
            <li><b>2</b><span>Te confirmamos precio, stock y fecha de entrega.</span></li>
            <li><b>3</b><span>Despachamos desde bodega directo a tu obra.</span></li>
          </ol>
          <div>
            <a className="btn" href={`https://wa.me/${contact.whatsapp || ''}`} target="_blank" rel="noreferrer">Coordinar una entrega</a>
          </div>
        </div>
        <div className="entrega__ruta" aria-hidden="true"><span className="entrega__truck"><Icon name="truck" size={56} /></span></div>
      </div>
    </section>
  )
}

function PromoTeaser({ n, promo }) {
  const ends = promo?.ends_at ? new Date(promo.ends_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' }) : null
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (reduced()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.promo__big', { xPercent: -10, autoAlpha: 0.4 }, { xPercent: 4, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: true } })
      gsap.to('.promo__sello', { rotate: 360, duration: 16, ease: 'none', repeat: -1 })
      gsap.fromTo('.promo__txt > *', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 72%', once: true } })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="section" ref={ref}>
      <div className="wrap promo">
        <div className="promo__big">
          {promo?.badge || 'Ofertas'}
          <small>{promo?.name || 'en productos seleccionados'}</small>
          <svg className="promo__sello" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="58" />
            <defs><path id="sello-circ" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
            <text><textPath href="#sello-circ" textLength="276" lengthAdjust="spacing">OFERTAS DE LA SEMANA · PRECIO DE OBRA · </textPath></text>
            <text className="pct" x="60" y="74" textAnchor="middle">%</text>
          </svg>
        </div>
        <div className="promo__txt">
          <h3>Precios especiales para constructores y maestros de obra.</h3>
          <p className="muted">
            {promo?.description ? `${promo.description}. ` : ''}
            {n > 0 ? `Hoy aplica a ${n} producto${n === 1 ? '' : 's'} del catálogo` : 'Consulta los productos con descuento vigente'}
            {ends ? ` y dura hasta el ${ends}.` : '. Las promociones cambian cada semana.'}
          </p>
          <div><Link to="/promociones" className="btn btn--carbon">Ver promociones</Link></div>
        </div>
      </div>
    </section>
  )
}

function Visit({ contact }) {
  const ref = useReveal([contact.lat])
  if (contact.lat == null) return null
  return (
    <section className="section section--concreto" ref={ref}>
      <div className="wrap visita">
        <div className="visita__txt" data-reveal>
          <h2>Visítanos en Loja</h2>
          <p className="muted">Av. 8 de Diciembre, junto a la Clínica Nataly. Parqueadero para camionetas y carga directa desde bodega.</p>
          <dl>
            <dt>Horario</dt><dd>{contact.hours}</dd>
            <dt>Teléfono</dt><dd>{contact.phone}</dd>
            <dt>Correo</dt><dd>{contact.email}</dd>
          </dl>
          <div><a className="link" href={contact.maps_url} target="_blank" rel="noreferrer">Abrir en Google Maps</a></div>
        </div>
        <div className="mapa-wrap" data-reveal><MapView lat={Number(contact.lat)} lng={Number(contact.lng)} address={contact.address} height={420} /></div>
      </div>
    </section>
  )
}
