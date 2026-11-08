import { useParams, NavLink, useSearchParams, Link } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { useAsync } from '../hooks/useAsync'
import { useReveal } from '../hooks/useGsap'
import { listCategories, listProducts } from '../services/catalog'
import { useSettings } from '../components/Layout'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icons'

const SORTS = {
  relevancia: { label: 'Más pedidos primero', fn: (a, b) => Number(b.is_featured) - Number(a.is_featured) || a.name.localeCompare(b.name) },
  'precio-asc': { label: 'Precio: menor a mayor', fn: (a, b) => a.final_price - b.final_price },
  'precio-desc': { label: 'Precio: mayor a menor', fn: (a, b) => b.final_price - a.final_price },
  nombre: { label: 'Nombre A–Z', fn: (a, b) => a.name.localeCompare(b.name) },
}

export default function Catalog() {
  const { category } = useParams()
  const [params, setParams] = useSearchParams()
  const search = params.get('q') || ''
  const sort = params.get('orden') || 'relevancia'
  const soloPromo = params.get('promo') === '1'
  const [q, setQ] = useState(search)
  useEffect(() => setQ(search), [search])
  const { contact = {} } = useSettings()
  const cats = useAsync(listCategories, [])
  const all = useAsync(() => listProducts(), [])
  const prods = useAsync(() => listProducts({ category, search }), [category, search])
  const ref = useReveal([prods.data, sort, soloPromo])
  const current = (cats.data || []).find((c) => c.slug === category)
  const counts = useMemo(() => (all.data || []).reduce((m, p) => ((m[p.category_slug] = (m[p.category_slug] || 0) + 1), m), {}), [all.data])

  const setParam = (k, v) => { const next = new URLSearchParams(params); if (v) next.set(k, v); else next.delete(k); setParams(next) }
  const submit = (e) => { e.preventDefault(); setParam('q', q.trim()) }
  const list = useMemo(() => {
    let rows = prods.data || []
    if (soloPromo) rows = rows.filter((p) => p.discount_pct > 0)
    return [...rows].sort(SORTS[sort]?.fn || SORTS.relevancia.fn)
  }, [prods.data, sort, soloPromo])

  return (
    <section className="section--tight" ref={ref}>
      <div className="wrap">
        <nav className="migas" aria-label="Ruta"><Link to="/">Inicio</Link> / <Link to="/catalogo">Catálogo</Link>{current && <> / <span>{current.name}</span></>}</nav>
        <div className="titulo">
          <div className="titulo__row"><h2>{search ? `Resultados para “${search}”` : current ? current.name : 'Catálogo'}</h2></div>
          <p className="titulo__lead">{current?.description ? `${current.description}. ` : ''}Precios por unidad de venta. Agrega lo que necesites y te confirmamos stock y fecha de entrega.</p>
        </div>
        <div className="catalogo">
          <aside className="filtros">
            <form className="buscar" onSubmit={submit} role="search">
              <input id="buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto, marca o código" aria-label="Buscar" />
              <button type="submit" aria-label="Buscar"><Icon name="search" size={20} /></button>
            </form>
            <div>
              <h3>Categorías</h3>
              <ul>
                <li><NavLink to={`/catalogo${search ? `?q=${encodeURIComponent(search)}` : ''}`} end>Todas <span className="n num">{all.data?.length ?? ''}</span></NavLink></li>
                {(cats.data || []).map((c) => <li key={c.id}><NavLink to={`/catalogo/${c.slug}`}>{c.name} <span className="n num">{counts[c.slug] || 0}</span></NavLink></li>)}
              </ul>
            </div>
            <div className="ayuda">
              <strong>¿No encuentras algo?</strong>
              <p>Tenemos más productos en bodega de los que ves aquí. Escríbenos y te cotizamos.</p>
              <a className="btn btn--wa btn--sm" href={`https://wa.me/${contact.whatsapp || ''}?text=${encodeURIComponent('Hola, busco un producto que no veo en el catálogo')}`} target="_blank" rel="noreferrer">Preguntar por WhatsApp</a>
            </div>
          </aside>
          <div>
            <div className="toolbar">
              <span className="toolbar__count">{prods.data ? <><b>{list.length}</b> producto{list.length === 1 ? '' : 's'}</> : 'Cargando…'}</span>
              <div className="toolbar__ctl">
                <label className="toggle"><input type="checkbox" checked={soloPromo} onChange={(e) => setParam('promo', e.target.checked ? '1' : '')} /> Solo en promoción</label>
                <label className="sr-only" htmlFor="orden">Ordenar por</label>
                <select id="orden" value={sort} onChange={(e) => setParam('orden', e.target.value === 'relevancia' ? '' : e.target.value)}>
                  {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </div>
            </div>
            {prods.loading && <div className="grid grid--3">{[...Array(6)].map((_, i) => <div className="sk-card" key={i}><div className="sk sk-img" /><div className="sk sk-l" style={{ width: '40%' }} /><div className="sk sk-l" /><div className="sk sk-l" style={{ width: '60%' }} /></div>)}</div>}
            {prods.error && <p className="error">No pudimos cargar el catálogo. {String(prods.error.message || prods.error)}</p>}
            {prods.data && list.length === 0 && (
              <div className="vacio">
                <h3>No encontramos productos{search ? ` para “${search}”` : ''}</h3>
                <p className="muted">Prueba con otra palabra o escríbenos: seguro lo tenemos en bodega.</p>
                <div className="row"><Link to="/catalogo" className="btn btn--outline btn--sm">Ver todo el catálogo</Link><a className="btn btn--wa btn--sm" href={`https://wa.me/${contact.whatsapp || ''}`} target="_blank" rel="noreferrer">Preguntar por WhatsApp</a></div>
              </div>
            )}
            {prods.data && list.length > 0 && <div className="grid grid--3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
          </div>
        </div>
      </div>
    </section>
  )
}
