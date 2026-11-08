import { Link } from 'react-router-dom'
import { money } from '../lib/pricing'
import { useCart } from '../hooks/useCart'
import Icon from './Icons'
import { useToast } from './Toast'

export default function ProductCard({ p }) {
  const { add } = useCart()
  const toast = useToast()
  const img = p.images?.[0]?.url
  const onAdd = () => { add(p, 1); toast(`${p.name} agregado al carrito`) }
  return (
    <article className="card" data-reveal>
      <Link to={`/producto/${p.slug}`} className="card__img" aria-label={p.name}>
        {img ? <img src={img} alt={p.name} loading="lazy" /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--acero)' }}><Icon name="materiales" size={48} /></div>}
        {p.discount_pct > 0 && <span className="badge">{p.badge || `-${p.discount_pct} %`}</span>}
        <span className={`stock ${p.stock > 0 ? 'stock--ok' : 'stock--no'}`}>{p.stock > 0 ? 'En stock' : 'Bajo pedido'}</span>
      </Link>
      <div className="card__body">
        <span className="card__cat">{p.category_name}</span>
        <Link to={`/producto/${p.slug}`} className="card__name">{p.name}</Link>
        <span className="card__meta">{[p.brand, p.sku].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="card__foot">
        <div className="precio num">
          <span className="precio__final">{money(p.final_price)}</span>
          {p.discount_pct > 0 && <span className="precio__antes">{money(p.price)}</span>}
          <span className="precio__unidad">por {p.unit}, incluye IVA</span>
        </div>
        <button className="card__add" onClick={onAdd}><Icon name="plus" /> Agregar al carrito</button>
      </div>
    </article>
  )
}
