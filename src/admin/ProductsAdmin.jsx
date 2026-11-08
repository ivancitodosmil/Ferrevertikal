import { useEffect, useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { adminListProducts, adminListCategories, saveProduct, deleteProduct, uploadProductImage, addImageByUrl, setPrimaryImage, deleteImage } from '../services/admin'
import { money, marginPct } from '../lib/pricing'
import { MargenChip, Modal, Confirm } from './shared'
import Icon from '../components/Icons'

const empty = { name: '', sku: '', brand: '', category_id: '', unit: 'unidad', cost: '', price: '', stock: 0, description: '', is_active: true, is_featured: false }

export default function ProductsAdmin() {
  const prods = useAsync(adminListProducts, [])
  const cats = useAsync(adminListCategories, [])
  const [editing, setEditing] = useState(null)   // null | {} | producto
  const [confirm, setConfirm] = useState(null)
  const [q, setQ] = useState('')
  const rows = (prods.data || []).filter((p) => !q || `${p.name} ${p.sku} ${p.brand} ${p.category_name}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <div className="admin__head">
        <h1>Productos</h1>
        <div className="row">
          <input id="p-buscar" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} style={{ padding: 9, border: '1.5px solid var(--linea)' }} />
          <button className="btn btn--sm" onClick={() => setEditing({ ...empty })}>Nuevo producto</button>
        </div>
      </div>
      <div className="panel tabla-scroll">
        {prods.error && <p className="error">{String(prods.error.message)}</p>}
        <table className="tabla">
          <thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Costo</th><th>Precio</th><th>Margen</th><th>Precio final</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.images?.[0] ? <img src={p.images[0].url} alt="" /> : <div style={{ width: 52, height: 40, background: 'var(--concreto)' }} />}</td>
                <td><strong>{p.name}</strong><br /><small className="muted">{p.sku} {p.brand && `· ${p.brand}`}</small></td>
                <td>{p.category_name}</td>
                <td className="num">{money(p.cost)}</td>
                <td className="num">{money(p.price)}</td>
                <td><MargenChip v={p.margin_pct} /></td>
                <td className="num">{p.promotion_id ? <><strong>{money(p.final_price)}</strong><br /><span className="chip chip--naranja">{p.badge || p.promotion_name}</span></> : <span className="muted">—</span>}</td>
                <td className="num">{p.stock}</td>
                <td>{p.is_active ? <span className="chip chip--ok">Activo</span> : <span className="chip chip--no">Oculto</span>} {p.is_featured && <span className="chip">Destacado</span>}</td>
                <td><div className="acciones">
                  <button className="btn btn--outline btn--sm btn--icon" onClick={() => setEditing(p)} aria-label="Editar"><Icon name="edit" size={16} /></button>
                  <button className="btn btn--outline btn--sm btn--icon" onClick={() => setConfirm(p)} aria-label="Eliminar"><Icon name="trash" size={16} /></button>
                </div></td>
              </tr>
            ))}
            {rows.length === 0 && !prods.loading && <tr><td colSpan="10" className="estado">No hay productos. Crea el primero.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <ProductForm initial={editing} categories={cats.data || []} onClose={() => { setEditing(null); prods.reload() }} />}
      {confirm && <Confirm text={`¿Eliminar "${confirm.name}" y sus imágenes?`} onNo={() => setConfirm(null)} onYes={async () => { await deleteProduct(confirm.id); setConfirm(null); prods.reload() }} />}
    </>
  )
}

function ProductForm({ initial, categories, onClose }) {
  const [v, setV] = useState({ ...empty, ...initial })
  const [images, setImages] = useState(initial.images || [])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [over, setOver] = useState(false)
  const [url, setUrl] = useState('')
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const margin = marginPct(Number(v.cost || 0), Number(v.price || 0))

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null)
    try { const saved = await saveProduct(v); setV((s) => ({ ...s, id: saved.id })); if (!initial.id) { /* seguir editando para subir imágenes */ } else onClose() }
    catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  const upload = async (files) => {
    if (!v.id) { setErr('Guarda el producto primero y luego sube las imágenes.'); return }
    setBusy(true); setErr(null)
    try {
      for (const f of files) {
        const img = await uploadProductImage(v.id, f, { isPrimary: images.length === 0 })
        setImages((cur) => [...cur, img])
      }
    } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  const addUrl = async () => {
    if (!url || !v.id) return
    const img = await addImageByUrl(v.id, url, images.length === 0); setImages((c) => [...c, img]); setUrl('')
  }

  return (
    <Modal title={v.id ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
        <div className="form-grid">
          <label className="campo full">Nombre<input id="f-name" required value={v.name} onChange={set('name')} /></label>
          <label className="campo">Código / SKU<input id="f-sku" value={v.sku || ''} onChange={set('sku')} /></label>
          <label className="campo">Marca<input id="f-brand" value={v.brand || ''} onChange={set('brand')} /></label>
          <label className="campo">Categoría<select id="f-cat" value={v.category_id || ''} onChange={set('category_id')}><option value="">Sin categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="campo">Unidad de venta<input id="f-unit" value={v.unit} onChange={set('unit')} placeholder="unidad, saco, quintal, metro…" /></label>
          <label className="campo">Costo (USD)<input id="f-cost" type="number" step="0.01" min="0" value={v.cost} onChange={set('cost')} /><small>Lo que te cuesta. Nunca se muestra al público.</small></label>
          <label className="campo">Precio de venta (USD)<input id="f-price" type="number" step="0.01" min="0" required value={v.price} onChange={set('price')} /><small>Margen: <MargenChip v={margin} /></small></label>
          <label className="campo">Stock<input id="f-stock" type="number" min="0" value={v.stock} onChange={set('stock')} /></label>
          <label className="campo full">Descripción<textarea id="f-desc" rows="3" value={v.description || ''} onChange={set('description')} /></label>
          <label className="campo campo--check"><input id="f-active" type="checkbox" checked={!!v.is_active} onChange={set('is_active')} />Visible en la web</label>
          <label className="campo campo--check"><input id="f-feat" type="checkbox" checked={!!v.is_featured} onChange={set('is_featured')} />Destacado en inicio</label>
        </div>
        {err && <p className="error">{err}</p>}
        <div className="row"><button className="btn" disabled={busy}>{busy ? 'Guardando…' : v.id ? 'Guardar cambios' : 'Guardar y continuar con imágenes'}</button></div>
      </form>

      <div style={{ display: 'grid', gap: 12 }}>
        <h3>Imágenes</h3>
        {!v.id && <p className="muted">Guarda el producto para habilitar la carga de imágenes.</p>}
        {v.id && (
          <>
            <div className="imgs">
              {images.map((im) => (
                <figure key={im.id} className={im.is_primary ? 'primary' : ''}>
                  <img src={im.url} alt="" />
                  <figcaption>
                    {!im.is_primary && <button type="button" onClick={async () => { await setPrimaryImage(im); setImages((c) => c.map((x) => ({ ...x, is_primary: x.id === im.id }))) }}>Principal</button>}
                    {im.is_primary && <span className="chip chip--naranja">Principal</span>}
                    <button type="button" onClick={async () => { await deleteImage(im); setImages((c) => c.filter((x) => x.id !== im.id)) }}>Quitar</button>
                  </figcaption>
                </figure>
              ))}
            </div>
            <label className={`dropzone ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload([...e.dataTransfer.files]) }}>
              <Icon name="plus" size={28} />
              <span>Arrastra fotos aquí o haz clic para elegir (JPG, PNG, WebP · máx. 5 MB)</span>
              <input id="f-files" type="file" accept="image/*" multiple hidden onChange={(e) => upload([...e.target.files])} />
            </label>
            <div className="row">
              <input id="f-url" placeholder="o pega la URL de una imagen" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1, padding: 9, border: '1.5px solid var(--linea)', minWidth: 200 }} />
              <button type="button" className="btn btn--outline btn--sm" onClick={addUrl}>Agregar URL</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
