import { useMemo, useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { adminListPromotions, adminListProducts, adminListCategories, savePromotion, deletePromotion } from '../services/admin'
import { money, priceProduct, promotionApplies } from '../lib/pricing'
import { MargenChip, Modal, Confirm, toLocalInput } from './shared'
import Icon from '../components/Icons'

const empty = { name: '', badge: '', description: '', discount_type: 'percent', discount_value: 10, scope: 'all', category_id: '', product_id: '', min_margin_pct: '', keep_margin_pct: '', starts_at: '', ends_at: '', is_active: true, priority: 0 }

export default function PromotionsAdmin() {
  const promos = useAsync(adminListPromotions, [])
  const prods = useAsync(adminListProducts, [])
  const cats = useAsync(adminListCategories, [])
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const affected = (pr) => (prods.data || []).filter((p) => promotionApplies(pr, p)).length

  return (
    <>
      <div className="admin__head"><h1>Promociones</h1><button className="btn btn--sm" onClick={() => setEditing({ ...empty })}>Nueva promoción</button></div>
      <p className="aviso">Una promoción puede aplicar a todo el catálogo, a una categoría o a un producto. Con <strong>margen mínimo</strong> solo entran los productos que tengan ese margen o más; con <strong>margen a proteger</strong> el descuento se recorta para no bajar de ese margen.</p>
      <div className="panel tabla-scroll">
        <table className="tabla">
          <thead><tr><th>Promoción</th><th>Descuento</th><th>Aplica a</th><th>Margen mín.</th><th>Protege</th><th>Vigencia</th><th>Productos</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {(promos.data || []).map((pr) => (
              <tr key={pr.id}>
                <td><strong>{pr.name}</strong> {pr.badge && <span className="chip chip--naranja">{pr.badge}</span>}</td>
                <td className="num">{pr.discount_type === 'percent' ? `${pr.discount_value} %` : money(pr.discount_value)}</td>
                <td>{pr.scope === 'all' ? 'Todo el catálogo' : pr.scope === 'category' ? (cats.data || []).find((c) => c.id === pr.category_id)?.name || 'Categoría' : (prods.data || []).find((p) => p.id === pr.product_id)?.name || 'Producto'}</td>
                <td className="num">{pr.min_margin_pct != null ? `${pr.min_margin_pct} %` : '—'}</td>
                <td className="num">{pr.keep_margin_pct != null ? `${pr.keep_margin_pct} %` : '—'}</td>
                <td><small>{new Date(pr.starts_at).toLocaleDateString('es-EC')} → {pr.ends_at ? new Date(pr.ends_at).toLocaleDateString('es-EC') : 'sin fin'}</small></td>
                <td className="num">{affected(pr)}</td>
                <td>{pr.is_active ? <span className="chip chip--ok">Activa</span> : <span className="chip chip--no">Pausada</span>}</td>
                <td><div className="acciones">
                  <button className="btn btn--outline btn--sm btn--icon" onClick={() => setEditing(pr)} aria-label="Editar"><Icon name="edit" size={16} /></button>
                  <button className="btn btn--outline btn--sm btn--icon" onClick={() => setConfirm(pr)} aria-label="Eliminar"><Icon name="trash" size={16} /></button>
                </div></td>
              </tr>
            ))}
            {promos.data?.length === 0 && <tr><td colSpan="9" className="estado">Sin promociones. Crea la primera.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <PromoForm initial={editing} products={prods.data || []} categories={cats.data || []} onClose={() => { setEditing(null); promos.reload() }} />}
      {confirm && <Confirm text={`¿Eliminar la promoción "${confirm.name}"?`} onNo={() => setConfirm(null)} onYes={async () => { await deletePromotion(confirm.id); setConfirm(null); promos.reload() }} />}
    </>
  )
}

function PromoForm({ initial, products, categories, onClose }) {
  const [v, setV] = useState({ ...empty, ...initial, starts_at: toLocalInput(initial.starts_at), ends_at: toLocalInput(initial.ends_at), min_margin_pct: initial.min_margin_pct ?? '', keep_margin_pct: initial.keep_margin_pct ?? '' })
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Vista previa: qué productos entran y a qué precio quedarían
  const preview = useMemo(() => {
    const pr = { ...v, id: v.id || 'preview', is_active: true, starts_at: null, ends_at: null,
      min_margin_pct: v.min_margin_pct === '' ? null : Number(v.min_margin_pct),
      keep_margin_pct: v.keep_margin_pct === '' ? null : Number(v.keep_margin_pct) }
    return products.filter((p) => promotionApplies(pr, p)).map((p) => priceProduct(p, [pr]))
  }, [v, products])

  const save = async (e) => { e.preventDefault(); try { await savePromotion(v); onClose() } catch (ex) { setErr(ex.message) } }

  return (
    <Modal title={v.id ? 'Editar promoción' : 'Nueva promoción'} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
        <div className="form-grid">
          <label className="campo full">Nombre<input id="pr-name" required value={v.name} onChange={set('name')} placeholder="Ej.: Semana del constructor" /></label>
          <label className="campo">Etiqueta en la tarjeta<input id="pr-badge" value={v.badge || ''} onChange={set('badge')} placeholder="Ej.: -15 %" /></label>
          <label className="campo">Prioridad<input id="pr-prio" type="number" value={v.priority} onChange={set('priority')} /><small>Si dos promociones aplican, gana el mejor precio; la prioridad desempata.</small></label>
          <label className="campo">Tipo de descuento<select id="pr-type" value={v.discount_type} onChange={set('discount_type')}><option value="percent">Porcentaje (%)</option><option value="fixed">Monto fijo (USD)</option></select></label>
          <label className="campo">Valor<input id="pr-val" type="number" step="0.01" min="0" required value={v.discount_value} onChange={set('discount_value')} /></label>
          <label className="campo">Aplica a<select id="pr-scope" value={v.scope} onChange={set('scope')}><option value="all">Todo el catálogo</option><option value="category">Una categoría</option><option value="product">Un producto</option></select></label>
          {v.scope === 'category' && <label className="campo">Categoría<select id="pr-cat" required value={v.category_id || ''} onChange={set('category_id')}><option value="">Elige…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {v.scope === 'product' && <label className="campo">Producto<select id="pr-prod" required value={v.product_id || ''} onChange={set('product_id')}><option value="">Elige…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
          <label className="campo">Margen mínimo para entrar (%)<input id="pr-min" type="number" step="0.1" value={v.min_margin_pct} onChange={set('min_margin_pct')} placeholder="Vacío = todos" /><small>Solo productos con margen igual o mayor.</small></label>
          <label className="campo">Margen a proteger (%)<input id="pr-keep" type="number" step="0.1" value={v.keep_margin_pct} onChange={set('keep_margin_pct')} placeholder="Vacío = sin límite" /><small>El precio nunca bajará de este margen.</small></label>
          <label className="campo">Inicio<input id="pr-start" type="datetime-local" value={v.starts_at} onChange={set('starts_at')} /></label>
          <label className="campo">Fin<input id="pr-end" type="datetime-local" value={v.ends_at} onChange={set('ends_at')} /><small>Vacío = sin fecha de fin.</small></label>
          <label className="campo full">Descripción<input id="pr-desc" value={v.description || ''} onChange={set('description')} /></label>
          <label className="campo campo--check"><input id="pr-active" type="checkbox" checked={!!v.is_active} onChange={set('is_active')} />Activa</label>
        </div>
        {err && <p className="error">{err}</p>}
        <div className="row"><button className="btn">Guardar promoción</button></div>
      </form>
      <div className="preview">
        <h3>Vista previa: {preview.length} producto{preview.length === 1 ? '' : 's'} entran</h3>
        {preview.length > 0 && (
          <div className="tabla-scroll"><table>
            <thead><tr><th>Producto</th><th>Precio</th><th>Margen</th><th>Con promo</th><th>Margen final</th></tr></thead>
            <tbody>{preview.slice(0, 30).map((p) => (
              <tr key={p.id}><td>{p.name}</td><td className="num">{money(p.price)}</td><td><MargenChip v={p.margin_pct} /></td><td className="num"><strong>{money(p.final_price)}</strong></td><td><MargenChip v={p.final_margin_pct} /></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </Modal>
  )
}
