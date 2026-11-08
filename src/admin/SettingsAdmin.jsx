import { useEffect, useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { adminGetSettings, saveSetting, adminListProfiles, setUserRole } from '../services/admin'
import { useAuth } from '../hooks/useAuth'

export default function SettingsAdmin() {
  const s = useAsync(adminGetSettings, [])
  const users = useAsync(adminListProfiles, [])
  const { user } = useAuth()
  const [contact, setContact] = useState({})
  const [home, setHome] = useState({})
  const [pay, setPay] = useState({})
  const [msg, setMsg] = useState(null)
  const [roleForm, setRoleForm] = useState({ email: '', role: 'admin' })
  useEffect(() => { if (s.data) { setContact(s.data.contact || {}); setHome(s.data.home || {}); setPay({ enabled: false, provider: 'payphone', iva_pct: 15, min_delivery: 50, cod_enabled: true, ...(s.data.payments || {}) }) } }, [s.data])

  const save = async (e) => {
    e.preventDefault()
    try { await saveSetting('contact', contact); await saveSetting('home', home); await saveSetting('payments', { ...pay, iva_pct: pay.iva_pct === '' || pay.iva_pct == null || Number.isNaN(Number(pay.iva_pct)) ? 15 : Math.max(0, Number(pay.iva_pct)), min_delivery: Number(pay.min_delivery) || 0 }); setMsg('Configuración guardada.') }
    catch (ex) { setMsg(ex.message) }
  }
  const changeRole = async (e) => {
    e.preventDefault()
    try { await setUserRole(roleForm.email, roleForm.role); setMsg(`Rol actualizado para ${roleForm.email}`); users.reload() }
    catch (ex) { setMsg(ex.message) }
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const f = (obj, setObj, k) => ({ id: `s-${k}`, value: obj[k] || '', onChange: (e) => setObj((o) => ({ ...o, [k]: e.target.value })) })

  return (
    <>
      <div className="admin__head"><h1>Configuración</h1></div>
      {msg && <p className="aviso">{msg}</p>}
      <form className="panel" onSubmit={save}>
        <h3>Datos de contacto</h3>
        <div className="form-grid">
          <label className="campo">WhatsApp (solo números, con código de país)<input {...f(contact, setContact, 'whatsapp')} placeholder="593997069684" /></label>
          <label className="campo">Quién atiende el WhatsApp<input {...f(contact, setContact, 'whatsapp_name')} placeholder="Mónica" /><small>Se muestra en el carrito: "Tu lista le llega a Mónica…"</small></label>
          <label className="campo">Teléfono visible<input {...f(contact, setContact, 'phone')} /></label>
          <label className="campo">Correo<input {...f(contact, setContact, 'email')} /></label>
          <label className="campo">Instagram<input {...f(contact, setContact, 'instagram')} /></label>
          <label className="campo full">Dirección<input {...f(contact, setContact, 'address')} /></label>
          <label className="campo">Horario<input {...f(contact, setContact, 'hours')} /></label>
          <label className="campo">Enlace de Google Maps<input {...f(contact, setContact, 'maps_url')} /></label>
          <label className="campo">Latitud del mapa<input {...f(contact, setContact, 'lat')} placeholder="-3.96280" /></label>
          <label className="campo">Longitud del mapa<input {...f(contact, setContact, 'lng')} placeholder="-79.21459" /><small>Clic derecho en Google Maps → copia las coordenadas.</small></label>
        </div>
        <h3>Textos de la portada</h3>
        <div className="form-grid">
          <label className="campo">Frase (eslogan)<input {...f(home, setHome, 'tagline')} /></label>
          <label className="campo">Nota de entrega<input {...f(home, setHome, 'delivery_note')} /></label>
        </div>
        <h3>Pago en línea con entrega a domicilio (PayPhone)</h3>
        <p className="muted">Los pedidos por WhatsApp funcionan siempre. Para cobrar con tarjeta: en <a href="https://developer.payphonetodoesposible.com" target="_blank" rel="noreferrer">PayPhone Developers</a> crea una aplicación tipo <b>WEB</b>, pon tu dominio y como <b>URL de respuesta</b> <code>{origin}/pago/respuesta</code>; copia aquí el Token y el StoreId.</p>
        <label className="campo campo--check"><input id="s-pay-cod" type="checkbox" checked={pay.cod_enabled ?? true} onChange={(e) => setPay((o) => ({ ...o, cod_enabled: e.target.checked }))} /> Ofrecer "Pagar al recibir" en el carrito (el cliente deja nombre, teléfono y cómo lo recibe; se le llama para confirmar)</label>
        <label className="campo campo--check"><input id="s-pay-enabled" type="checkbox" checked={!!pay.enabled} onChange={(e) => setPay((o) => ({ ...o, enabled: e.target.checked }))} /> Mostrar el botón "Pagar con tarjeta" en el carrito</label>
        <div className="form-grid">
          <label className="campo full">Token de PayPhone<input {...f(pay, setPay, 'token')} placeholder="eyJhbGciOi…" /></label>
          <label className="campo">StoreId<input {...f(pay, setPay, 'store_id')} /></label>
          <label className="campo">Pedido mínimo para entrega a domicilio (USD)<input {...f(pay, setPay, 'min_delivery')} type="number" min="0" step="1" /><small>Por debajo de este monto no se muestra el pago en línea (solo WhatsApp). 0 = sin mínimo.</small></label>
          <label className="campo">IVA a desglosar (%)<input {...f(pay, setPay, 'iva_pct')} type="number" min="0" max="30" /><small>Los precios del catálogo ya son finales. Pon <b>0</b> si no emites factura: el carrito, el pago y los mensajes muestran solo el total, sin desglose de IVA. Pon 15 si facturas y quieres verlo desglosado.</small></label>
        </div>
        <div><button className="btn">Guardar configuración</button></div>
      </form>

      {user?.profile?.role === 'superadmin' && (
        <div className="panel">
          <h3>Usuarios y permisos</h3>
          <p className="muted">Para agregar un administrador: la persona se registra en la app (o la creas en Supabase → Authentication) y aquí le asignas el rol.</p>
          <table className="tabla"><thead><tr><th>Correo</th><th>Nombre</th><th>Rol</th></tr></thead>
            <tbody>{(users.data || []).map((u) => <tr key={u.id}><td>{u.email}</td><td>{u.full_name}</td><td><span className={`chip ${u.role === 'superadmin' ? 'chip--naranja' : ''}`}>{u.role}</span></td></tr>)}</tbody></table>
          <form className="row" onSubmit={changeRole}>
            <input id="r-email" type="email" required placeholder="correo@ejemplo.com" value={roleForm.email} onChange={(e) => setRoleForm((r) => ({ ...r, email: e.target.value }))} style={{ padding: 9, border: '1.5px solid var(--linea)', flex: 1, minWidth: 200 }} />
            <select id="r-role" value={roleForm.role} onChange={(e) => setRoleForm((r) => ({ ...r, role: e.target.value }))} style={{ padding: 9, border: '1.5px solid var(--linea)' }}>
              <option value="admin">admin</option><option value="superadmin">superadmin</option><option value="customer">customer (sin acceso)</option>
            </select>
            <button className="btn btn--sm">Asignar rol</button>
          </form>
        </div>
      )}
    </>
  )
}
