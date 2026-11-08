import { useAsync } from '../hooks/useAsync'
import { useReveal } from '../hooks/useGsap'
import { listPromotedProducts, listActivePromotions } from '../services/catalog'
import ProductCard from '../components/ProductCard'

export default function Promotions() {
  const prods = useAsync(listPromotedProducts, [])
  const promos = useAsync(listActivePromotions, [])
  const ref = useReveal([prods.data])
  return (
    <section className="section--tight" ref={ref}>
      <div className="wrap">
        <div className="titulo">
          <div className="titulo__row"><h2>Promociones</h2></div>
          <p className="titulo__lead">Descuentos vigentes esta semana. El precio grande es el que pagas; el tachado es el de lista.</p>
        </div>
        {promos.data?.length > 0 && (
          <div className="row" style={{ marginBottom: 28 }}>
            {promos.data.map((pr) => (
              <div key={pr.id} className="aviso">
                <strong>{pr.badge} {pr.name}.</strong>{pr.description ? ` ${pr.description}.` : ''}
                {pr.ends_at ? ` Hasta el ${new Date(pr.ends_at).toLocaleDateString('es-EC')}.` : ''}
              </div>
            ))}
          </div>
        )}
        {prods.loading && <p className="estado">Cargando…</p>}
        {prods.data && prods.data.length === 0 && <div className="vacio"><h3>Hoy no hay promociones activas</h3><p className="muted">Vuelve pronto o escríbenos para precios por volumen.</p></div>}
        <div className="grid grid--4">{(prods.data || []).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </div>
    </section>
  )
}
