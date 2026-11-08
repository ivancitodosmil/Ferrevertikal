import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { adminListCategories, saveCategory, deleteCategory } from '../services/admin'
import { Modal, Confirm } from './shared'
import Icon from '../components/Icons'

const icons = ['cemento', 'hierro', 'herramientas', 'materiales', 'pinturas', 'electricos', 'plomeria', 'cubiertas']
const empty = { name: '', slug: '', description: '', icon: 'materiales', sort_order: 0, is_active: true }

export default function CategoriesAdmin() {
  const cats = useAsync(adminListCategories, [])
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  return (
    <>
      <div className="admin__head"><h1>Categorías</h1><button className="btn btn--sm" onClick={() => setEditing({ ...empty })}>Nueva categoría</button></div>
      <div className="panel tabla-scroll">
        <table className="tabla">
          <thead><tr><th>Orden</th><th>Ícono</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {(cats.data || []).map((c) => (
              <tr key={c.id}>
                <td className="num">{c.sort_order}</td>
                <td><Icon name={c.icon || 'materiales'} /></td>
                <td><strong>{c.name}</strong><br /><small className="muted">/catalogo/{c.slug}</small></td>
                <td>{c.description}</td>
                <td>{c.is_active ? <span className="chip chip--ok">Activa</span> : <span className="chip chip--no">Oculta</span>}</td>
                <td><div className="acciones">
                  <button className="btn btn--outline btn--sm btn--icon" onClick={() => setEditing(c)} aria-label="Editar"><Icon name="edit" size={16} /></button>
                  <button className="btn btn--outline btn--sm btn--icon" onClick={() => setConfirm(c)} aria-label="Eliminar"><Icon name="trash" size={16} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <CategoryForm initial={editing} onClose={() => { setEditing(null); cats.reload() }} />}
      {confirm && <Confirm text={`¿Eliminar la categoría "${confirm.name}"? Los productos quedarán sin categoría.`} onNo={() => setConfirm(null)} onYes={async () => { await deleteCategory(confirm.id); setConfirm(null); cats.reload() }} />}
    </>
  )
}

function CategoryForm({ initial, onClose }) {
  const [v, setV] = useState({ ...empty, ...initial })
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const save = async (e) => { e.preventDefault(); try { await saveCategory(v); onClose() } catch (ex) { setErr(ex.message) } }
  return (
    <Modal title={v.id ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      <form onSubmit={save} className="form-grid">
        <label className="campo full">Nombre<input id="c-name" required value={v.name} onChange={set('name')} /></label>
        <label className="campo">Ícono<select id="c-icon" value={v.icon || 'materiales'} onChange={set('icon')}>{icons.map((i) => <option key={i} value={i}>{i}</option>)}</select></label>
        <label className="campo">Orden<input id="c-order" type="number" value={v.sort_order} onChange={set('sort_order')} /></label>
        <label className="campo full">Descripción corta<input id="c-desc" value={v.description || ''} onChange={set('description')} /></label>
        <label className="campo campo--check"><input id="c-active" type="checkbox" checked={!!v.is_active} onChange={set('is_active')} />Visible en la web</label>
        {err && <p className="error full">{err}</p>}
        <div className="full"><button className="btn">Guardar</button></div>
      </form>
    </Modal>
  )
}
