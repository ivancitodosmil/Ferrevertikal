import { useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { adminListOrders, setOrderStatus, adminListMessages, setMessageStatus } from '../services/admin'
import { money } from '../lib/pricing'
import { ORDER_STATUS, DELIVERY, CHANNEL, mapsLink } from '../lib/orders'

const CHIP = { nuevo: 'chip--naranja', pendiente_pago: '', pagado: 'chip--ok', pago_por_verificar: 'chip--naranja', pago_fallido: 'chip--no', en_preparacion: 'chip--naranja', entregado: 'chip--ok', cancelado: 'chip--no' }
const FILTERS = [['todos', 'Todos'], ['nuevo', 'Nuevos'], ['pagado', 'Pagados'], ['pago_por_verificar', 'Por verificar'], ['en_preparacion', 'En preparación'], ['entregado', 'Entregados'], ['mensajes', 'Mensajes de contacto']]

export default function OrdersAdmin() {
  const orders = useAsync(adminListOrders, [])
  const msgs = useAsync(adminListMessages, [])
  const [filter, setFilter] = useState('todos')
  const list = (orders.data || []).filter((o) => filter === 'todos' || o.status === filter)
  return (
    <>
      <div className="admin__head"><h1>Pedidos</h1></div>
      <div className="chips" style={{ marginBottom: 16 }}>
        {FILTERS.map(([k, l]) => <a key={k} href="#" className={filter === k ? 'active' : ''} onClick={(e) => { e.preventDefault(); setFilter(k) }}>{l} {k === 'mensajes' ? `(${(msgs.data || []).filter((m) => m.status === 'nuevo').length})` : k !== 'todos' && `(${(orders.data || []).filter((o) => o.status === k).length})`}</a>)}
      </div>
      {filter === 'mensajes' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {(msgs.data || []).map((m) => (
            <div className="panel" key={m.id}>
              <div className="admin__head" style={{ marginBottom: 0 }}>
                <div><strong>{m.customer_name}</strong> · {m.phone} {m.email && `· ${m.email}`} <span className={`chip ${m.status === 'nuevo' ? 'chip--naranja' : 'chip--ok'}`}>{m.status === 'nuevo' ? 'Nuevo' : 'Atendido'}</span><br /><small className="muted">{new Date(m.created_at).toLocaleString('es-EC')}</small></div>
                <button className="btn btn--sm btn--outline" onClick={async () => { await setMessageStatus(m.id, m.status === 'nuevo' ? 'atendido' : 'nuevo'); msgs.reload() }}>{m.status === 'nuevo' ? 'Marcar atendido' : 'Marcar nuevo'}</button>
              </div>
              <p>{m.message}</p>
              <a className="btn btn--sm" style={{ justifySelf: 'start' }} href={`https://wa.me/${String(m.phone).replace(/\D/g, '').replace(/^0/, '593')}`} target="_blank" rel="noreferrer">Responder por WhatsApp</a>
            </div>
          ))}
          {msgs.data && msgs.data.length === 0 && <p className="estado">Aún no llegan mensajes desde la web.</p>}
        </div>
      )}
      {filter !== 'mensajes' && <div style={{ display: 'grid', gap: 14 }}>
        {list.map((o) => (
          <div className="panel" key={o.id}>
            <div className="admin__head" style={{ marginBottom: 0 }}>
              <div>
                <strong className="num">{o.code}</strong> <span className={`chip ${CHIP[o.status] || ''}`}>{ORDER_STATUS[o.status] || o.status}</span> <span className="chip">{CHANNEL[o.channel] || o.channel}</span><br />
                <strong>{o.customer_name}</strong> · {o.phone} {o.email && `· ${o.email}`}<br />
                <small className="muted">{new Date(o.created_at).toLocaleString('es-EC')} · {DELIVERY[o.delivery]}{o.address ? `: ${o.address}` : ''}{o.delivery_lat != null && <> · <a href={mapsLink(o.delivery_lat, o.delivery_lng)} target="_blank" rel="noreferrer"><b>Ver punto de entrega en Google Maps</b></a></>}</small>
              </div>
              <select id={`s-${o.id}`} value={o.status} onChange={async (e) => { await setOrderStatus(o.id, e.target.value); orders.reload() }} style={{ padding: 8, border: '1.5px solid var(--linea)', borderRadius: 8 }}>
                {Object.entries(ORDER_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            {o.notes && <p className="aviso">{o.notes}</p>}
            {o.payment && (
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                PayPhone #{o.payment.transaction_id}{o.payment.authorization_code && ` · autorización ${o.payment.authorization_code}`}{o.payment.card_brand && ` · ${o.payment.card_brand} •••• ${o.payment.last_digits}`}
                {o.payment.verified === false && <> · <b>no verificado automáticamente</b>{o.payment.reason ? ` (${o.payment.reason})` : ''}. Revisa en PayPhone Business antes de despachar.</>}
              </p>
            )}
            <table className="tabla"><tbody>
              {(o.items || []).map((i, n) => <tr key={n}><td>{i.qty} {i.unit}</td><td>{i.name}<br /><small className="muted">{[i.sku, i.promotion].filter(Boolean).join(' · ')}</small></td><td className="num">{money(i.price)}</td><td className="num">{money(i.qty * i.price)}</td></tr>)}
              {Number(o.tax) > 0 && (<>
                <tr><td colSpan="3" className="num" style={{ textAlign: 'right' }}>Subtotal</td><td className="num">{money(o.subtotal)}</td></tr>
                <tr><td colSpan="3" className="num" style={{ textAlign: 'right' }}>IVA</td><td className="num">{money(o.tax)}</td></tr>
              </>)}
              <tr><td colSpan="3" style={{ textAlign: 'right' }}><strong>Total</strong></td><td className="num"><strong>{money(o.total)}</strong></td></tr>
            </tbody></table>
            <a className="btn btn--sm" style={{ justifySelf: 'start' }} href={`https://wa.me/${String(o.phone).replace(/\D/g, '').replace(/^0/, '593')}?text=${encodeURIComponent(`Hola ${o.customer_name}, te escribimos de Ferre Vertikal por tu pedido ${o.code}.`)}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>
          </div>
        ))}
        {orders.data && list.length === 0 && <p className="estado">No hay pedidos en esta vista.</p>}
      </div>}
    </>
  )
}
