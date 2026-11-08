import { useMemo, useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { adminListPromotions, adminListProducts, adminListCategories, savePromotion, deletePromotion } from '../services/admin'
import { money, priceProduct, promotionApplies, rawDiscountedPrice, minQty } from '../lib/pricing'
import { MargenChip, Modal, Confirm, toLocalInput } from './shared'
import Icon from '../components/Icons'

const empty = { name: '', badge: '', description: '', discount_type: 'percent', discount_value: 10, scope: 'all', category_id: '', product_id: '', min_qty: 1, min_margin_pct: '', keep_margin_pct: '', starts_at: '', ends_at: '', is_active: true, priority: 0 }

/** Convierte lo que hay en el formulario en una promoción "calculable" (números; vacíos → null). */
const normalize = (v) => ({
  ...v, id: v.id || 'preview', is_active: true, starts_at: null, ends_at: null,
  discount_value: Number(v.discount_value || 0),
  min_qty: minQty(v),
  min_margin_pct: v.min_margin_pct === '' || v.min_margin_pct == null ? null : Number(v.min_margin_pct),
  keep_margin_pct: v.keep_margin_pct === '' || v.keep_margin_pct == null ? null : Number(v.keep_margin_pct),
})
const pct = (part, whole) => (Number(whole) > 0 ? Math.round((part / Number(whole)) * 1000) / 10 : 0)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export default function PromotionsAdmin() {
  const promos = useAsync(adminListPromotions, [])
  const prods = useAsync(adminListProducts, [])
  const cats = useAsync(adminListCategories, [])
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const affected = (pr) => (prods.data || []).filter((p) => promotionApplies(pr, p, new Date(), minQty(pr))).length

  return (
    <>
      <div className="admin__head"><h1>Promociones</h1><button className="btn btn--sm" onClick={() => setEditing({ ...empty })}>Nueva promoción</button></div>
      <p className="aviso">Una promoción puede aplicar a todo el catálogo, a una categoría o a un producto. Con <strong>margen mínimo</strong> solo entran los productos que tengan ese margen o más; con <strong>margen a proteger</strong> el descuento se recorta para no bajar de ese margen. Con <strong>cantidad mínima</strong> mayor a 1 el descuento es <strong>por volumen</strong>: solo se aplica cuando el cliente lleva esa cantidad o más del mismo producto.</p>
      <div className="panel tabla-scroll">
        <table className="tabla">
          <thead><tr><th>Promoción</th><th>Descuento</th><th>Desde</th><th>Aplica a</th><th>Margen mín.</th><th>Protege</th><th>Vigencia</th><th>Productos</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {(promos.data || []).map((pr) => (
              <tr key={pr.id}>
                <td><strong>{pr.name}</strong> {pr.badge && <span className="chip chip--naranja">{pr.badge}</span>}</td>
                <td className="num">{pr.discount_type === 'percent' ? `${pr.discount_value} %` : money(pr.discount_value)}</td>
                <td className="num">{minQty(pr) > 1 ? `${minQty(pr)} u.` : '—'}</td>
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
            {promos.data?.length === 0 && <tr><td colSpan="10" className="estado">Sin promociones. Crea la primera.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <PromoForm initial={editing} products={prods.data || []} categories={cats.data || []} onClose={() => { setEditing(null); promos.reload() }} />}
      {confirm && <Confirm text={`¿Eliminar la promoción "${confirm.name}"?`} onNo={() => setConfirm(null)} onYes={async () => { await deletePromotion(confirm.id); setConfirm(null); promos.reload() }} />}
    </>
  )
}

function PromoForm({ initial, products, categories, onClose }) {
  const [v, setV] = useState({ ...empty, ...initial, starts_at: toLocalInput(initial.starts_at), ends_at: toLocalInput(initial.ends_at), min_qty: initial.min_qty ?? 1, min_margin_pct: initial.min_margin_pct ?? '', keep_margin_pct: initial.keep_margin_pct ?? '' })
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const pr = useMemo(() => normalize(v), [v])
  const qty = pr.min_qty

  // Vista previa: qué productos entran y a qué precio quedarían (llevando la cantidad mínima)
  const preview = useMemo(
    () => products.filter((p) => promotionApplies(pr, p, new Date(), qty)).map((p) => priceProduct(p, [pr], qty)),
    [pr, qty, products],
  )

  // Mensaje bajo el valor del descuento: cuánto se rebaja y en cuánto se vendería
  const hint = useMemo(() => {
    if (!(pr.discount_value > 0)) return 'Escribe el valor para ver cuánto se descuenta y a qué precio quedaría.'
    const desde = qty > 1 ? `llevando ${qty} o más, ` : ''
    if (v.scope === 'product') {
      const p = products.find((x) => x.id === v.product_id)
      if (!p) return 'Elige el producto para ver cuánto se le descuenta.'
      if (!promotionApplies(pr, p, new Date(), qty)) return `No entra: el margen de este producto es ${Number(p.margin_pct || 0).toFixed(1)} %, menor al mínimo de ${pr.min_margin_pct} %.`
      const r = priceProduct(p, [pr], qty)
      const off = Math.round((Number(p.price) - r.final_price) * 100) / 100
      if (off <= 0) return `No cambia el precio: para proteger el margen de ${pr.keep_margin_pct} % no queda espacio para descontar.`
      const clipped = r.final_price > rawDiscountedPrice(pr, p) + 0.004
      return cap(`${desde}se le descuentan ${money(off)} por ${p.unit} (${pct(off, p.price)} %): pasa de ${money(p.price)} a ${money(r.final_price)} y queda con un margen de ${Number(r.final_margin_pct).toFixed(1)} %.${clipped ? ' El descuento se recortó para proteger el margen.' : ''}`)
    }
    if (!preview.length) return 'Ningún producto cumple las condiciones (revisa la categoría o el margen mínimo).'
    const offs = preview.map((p) => Number(p.price) - p.final_price)
    const avg = offs.reduce((s, n) => s + n, 0) / offs.length
    const clipped = preview.filter((p) => p.final_price > rawDiscountedPrice(pr, p) + 0.004).length
    return cap(`${desde}entran ${preview.length} producto${preview.length === 1 ? '' : 's'} con una rebaja promedio de ${money(avg)} por unidad${pr.discount_type === 'percent' ? ` (${pr.discount_value} %)` : ''}.${clipped ? ` En ${clipped} el descuento se recorta para proteger el margen.` : ''} El precio final de cada uno está en la vista previa.`)
  }, [pr, qty, v.scope, v.product_id, products, preview])

  const save = async (e) => { e.preventDefault(); try { await savePromotion(v); onClose() } catch (ex) { setErr(ex.message) } }

  return (
    <Modal title={v.id ? 'Editar promoción' : 'Nueva promoción'} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
        <div className="form-grid">
          <label className="campo full">Nombre<input id="pr-name" required value={v.name} onChange={set('name')} placeholder="Ej.: Semana del constructor" /></label>
          <label className="campo">Etiqueta en la tarjeta<input id="pr-badge" value={v.badge || ''} onChange={set('badge')} placeholder="Ej.: -15 %" /></label>
          <label className="campo">Prioridad<input id="pr-prio" type="number" value={v.priority} onChange={set('priority')} /><small>Si dos promociones aplican, gana el mejor precio; la prioridad desempata.</small></label>
          <label className="campo">Tipo de descuento<select id="pr-type" value={v.discount_type} onChange={set('discount_type')}><option value="percent">Porcentaje (%)</option><option value="fixed">Monto fijo (USD)</option></select></label>
          <label className="campo">Aplica a<select id="pr-scope" value={v.scope} onChange={set('scope')}><option value="all">Todo el catálogo</option><option value="category">Una categoría</option><option value="product">Un producto</option></select></label>
          {v.scope === 'category' && <label className="campo">Categoría<select id="pr-cat" required value={v.category_id || ''} onChange={set('category_id')}><option value="">Elige…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {v.scope === 'product' && <label className="campo">Producto<select id="pr-prod" required value={v.product_id || ''} onChange={set('product_id')}><option value="">Elige…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
          <label className="campo full">Valor del descuento{v.discount_type === 'percent' ? ' (%)' : ' (USD por unidad)'}
            <input id="pr-val" type="number" step="0.01" min="0" required value={v.discount_value} onChange={set('discount_value')} style={{ maxWidth: 240 }} />
            <small className="hint">{hint}</small>
          </label>
          <label className="campo">Cantidad mínima (volumen)<input id="pr-qty" type="number" min="1" step="1" value={v.min_qty} onChange={set('min_qty')} /><small>1 = aplica siempre. Ej.: 10 = solo cuando el cliente lleva 10 o más del mismo producto; en la web se muestra como "Desde 10".</small></label>
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
        <h3>Vista previa: {preview.length} producto{preview.length === 1 ? '' : 's'} entran{qty > 1 ? ` llevando ${qty} o más` : ''}</h3>
        {preview.length > 0 && (
          <div className="tabla-scroll"><table>
            <thead><tr><th>Producto</th><th>Precio</th><th>Margen</th><th>Rebaja</th><th>Con promo</th><th>Margen final</th></tr></thead>
            <tbody>{preview.slice(0, 30).map((p) => (
              <tr key={p.id}><td>{p.name}</td><td className="num">{money(p.price)}</td><td><MargenChip v={p.margin_pct} /></td><td className="num">−{money(Number(p.price) - p.final_price)}</td><td className="num"><strong>{money(p.final_price)}</strong></td><td><MargenChip v={p.final_margin_pct} /></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </Modal>
  )
}
