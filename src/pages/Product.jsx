import { useParams, Link } from 'react-router-dom'
import Lightbox from '../components/Lightbox'
import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { useReveal } from '../hooks/useGsap'
import { getProduct, listProducts } from '../services/catalog'
import { money } from '../lib/pricing'
import { useCart } from '../hooks/useCart'
import { useToast } from '../components/Toast'
import { useSettings } from '../components/Layout'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icons'

export default function Product() {
  const { slug } = useParams()
  const { data: p, loading, error } = useAsync(() => getProduct(slug), [slug])
  const related = useAsync(async () => p ? (await listProducts({ category: p.category_slug })).filter((x) => x.id !== p.id).slice(0, 4) : [], [p?.id])
  const [idx, setIdx] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [qty, setQty] = useState(1)
  const { add } = useCart()
  const toast = useToast()
  const { contact = {} } = useSettings()
  const ref = useReveal([related.data])

  if (loading) return <p className="estado">Cargando…</p>
  if (error || !p) return <div className="wrap section"><div className="vacio"><h3>No encontramos este producto</h3><Link to="/catalogo" className="btn btn--sm">Volver al catálogo</Link></div></div>

  const imgs = p.images || []
  const onAdd = () => { add(p, qty); toast(`${qty} × ${p.name} en tu carrito`) }
  const waText = encodeURIComponent(`Hola, quiero pedir ${qty} ${p.unit}(s) de ${p.name} (${p.sku || ''}) a ${money(p.final_price)} c/u. ¿Tienen disponible?`)

  return (
    <section className="section--tight" ref={ref}>
      <div className="wrap">
        <nav className="migas" aria-label="Ruta">
          <Link to="/catalogo">Catálogo</Link> / <Link to={`/catalogo/${p.category_slug}`}>{p.category_name}</Link> / <span>{p.name}</span>
        </nav>
        <div className="producto">
          <div className="galeria">
            <div className="galeria__main" onClick={() => imgs[idx] && setZoom(true)} role={imgs[idx] ? 'button' : undefined} aria-label="Ampliar imagen">
              {imgs[idx] ? <img src={imgs[idx].url} alt={imgs[idx].alt || p.name} /> : <img src="/images/banner.jpg" alt="" />}
              {p.discount_pct > 0 && <span className="badge">{p.badge || `-${p.discount_pct} %`}</span>}
            </div>
            {zoom && <Lightbox items={imgs.map((im) => ({ src: im.url, alt: im.alt || p.name, t: p.name }))} index={idx} onIndex={setIdx} onClose={() => setZoom(false)} />}
            {imgs.length > 1 && (
              <div className="galeria__thumbs">
                {imgs.map((im, i) => <button key={im.id} className={i === idx ? 'active' : ''} onClick={() => setIdx(i)} aria-label={`Imagen ${i + 1}`}><img src={im.url} alt="" /></button>)}
              </div>
            )}
          </div>
          <div className="ficha">
            <span className="card__cat">{p.category_name}{p.brand ? ` · ${p.brand}` : ''}</span>
            <h1>{p.name}</h1>
            {p.description && <p className="ficha__desc">{p.description}</p>}
            <div className="compra">
              <div className="precio num">
                <span className="precio__final">{money(p.final_price)}</span>
                {p.discount_pct > 0 && <span className="precio__antes">{money(p.price)}</span>}
                <span className="precio__unidad">por {p.unit}, incluye IVA{p.promotion_name ? ` · ${p.promotion_name}` : ''}</span>
              </div>
              <span className={`stock ${p.stock > 0 ? 'stock--ok' : 'stock--no'}`}>{p.stock > 0 ? `En stock: ${p.stock} ${p.unit}${p.stock === 1 ? '' : 's'} disponibles` : 'Bajo pedido, consulta el tiempo de entrega'}</span>
              <div className="compra__row">
                <div className="cantidad" aria-label="Cantidad">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">−</button>
                  <input id="qty" type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Cantidad" />
                  <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Más">+</button>
                </div>
                <button className="btn btn--lg" onClick={onAdd}><Icon name="plus" /> Agregar al carrito</button>
              </div>
              <a className="btn btn--wa btn--block" href={`https://wa.me/${contact.whatsapp || ''}?text=${waText}`} target="_blank" rel="noreferrer">Pedir por WhatsApp</a>
              <div className="compra__nota">
                <ul>
                  <li><Icon name="check" size={16} /> Entrega en obra en Loja en 24 h</li>
                  <li><Icon name="check" size={16} /> Paga con tarjeta o al recibir</li>
                  <li><Icon name="check" size={16} /> Retiro en bodega sin costo</li>
                </ul>
              </div>
            </div>
            <dl className="specs">
              {p.brand && <div><dt>Marca</dt><dd>{p.brand}</dd></div>}
              {p.sku && <div><dt>Código</dt><dd className="num">{p.sku}</dd></div>}
              <div><dt>Unidad de venta</dt><dd>{p.unit}</dd></div>
              <div><dt>Categoría</dt><dd><Link to={`/catalogo/${p.category_slug}`}>{p.category_name}</Link></dd></div>
            </dl>
          </div>
        </div>
        {related.data?.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div className="titulo"><div className="titulo__row"><h2>También en {p.category_name}</h2><Link to={`/catalogo/${p.category_slug}`} className="link">Ver toda la categoría</Link></div></div>
            <div className="grid grid--4">{related.data.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </div>
        )}
      </div>
    </section>
  )
}
