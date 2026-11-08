import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { money } from '../lib/pricing'
import { breakdown, newOrderCode, whatsappMessage, waLink, DEFAULT_IVA } from '../lib/orders'
import { createOrder } from '../services/catalog'
import { useSettings } from '../components/Layout'
import Icon, { WhatsAppIcon } from '../components/Icons'
import { isDemo } from '../lib/supabase'
import MapPicker from '../components/MapPicker'

export default function Cart() {
  const { items, total, setQty, remove, clear } = useCart()
  const { contact = {}, payments = {} } = useSettings()
  const nav = useNavigate()
  const ivaPct = Number(payments.iva_pct ?? DEFAULT_IVA)
  const b = breakdown(total, ivaPct)
  const cardEnabled = !!payments.enabled || isDemo // en demo se muestra una simulación del pago
  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', delivery: 'entrega', address: '', notes: '' })
  const minDelivery = Number(payments.min_delivery) || 0
  const belowMin = minDelivery > 0 && b.total < minDelivery
  const [point, setPoint] = useState(null) // { lat, lng } del punto de entrega
  const [busy, setBusy] = useState(null) // 'whatsapp' | 'tarjeta'
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null) // pedido enviado por WhatsApp
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const buildOrder = (channel) => ({
    code: newOrderCode(), ...form, channel,
    delivery_lat: point ? point.lat : null, delivery_lng: point ? point.lng : null,
    status: channel === 'tarjeta' ? 'pendiente_pago' : 'nuevo',
    items: items.map(({ id, name, sku, unit, qty, final_price }) => ({ id, name, sku, unit, qty, price: Number(final_price) })),
    subtotal: b.base, tax: b.tax, total: b.total,
  })

  const valid = () => {
    if (!form.customer_name.trim() || !form.phone.trim()) { setError('Escribe tu nombre y un teléfono para coordinar la entrega.'); return false }
    if (!point) { setError('Marca en el mapa dónde quieres recibir tu pedido.'); return false }
    setError(null); return true
  }

  const sendWhatsApp = async () => {
    // Sin formulario obligatorio: el pedido completo llega al WhatsApp de la tienda y desde ahí se coordina.
    setError(null); setBusy('whatsapp')
    const order = { ...buildOrder('whatsapp'), customer_name: form.customer_name.trim() || 'Cliente por WhatsApp', phone: form.phone.trim() || '' }
    try { await createOrder(order) } catch { /* si falla el registro igual se envía por WhatsApp */ }
    window.open(waLink(contact.whatsapp, whatsappMessage(order, ivaPct)), '_blank', 'noopener')
    clear(); setDone(order); setBusy(null)
  }

  const payCard = async () => {
    if (!valid()) return
    setBusy('tarjeta')
    try {
      const order = await createOrder(buildOrder('tarjeta'))
      nav(`/pago/${order.code}`)
    } catch (ex) { setError('No pudimos registrar el pedido. Intenta de nuevo o pídelo por WhatsApp.'); setBusy(null) }
  }

  if (done) return (
    <section className="section"><div className="wrap"><div className="vacio">
      <h3>Pedido {done.code} enviado</h3>
      <p className="muted">Se abrió WhatsApp con el detalle de tu pedido. Te confirmamos stock, total y hora de entrega por ese mismo chat.</p>
      <div className="row">
        <a className="btn btn--wa" href={waLink(contact.whatsapp, whatsappMessage(done, ivaPct))} target="_blank" rel="noreferrer"><WhatsAppIcon /> Abrir WhatsApp de nuevo</a>
        <Link to="/catalogo" className="btn btn--outline">Seguir comprando</Link>
      </div>
    </div></div></section>
  )

  if (!items.length) return (
    <section className="section"><div className="wrap"><div className="vacio">
      <h3>Tu carrito está vacío</h3>
      <p className="muted">Agrega productos desde el catálogo. Pagas con tarjeta o nos envías el pedido por WhatsApp.</p>
      <Link to="/catalogo" className="btn">Ir al catálogo</Link>
    </div></div></section>
  )

  return (
    <section className="section--tight">
      <div className="wrap">
        <div className="titulo"><div className="titulo__row"><h2>Tu carrito</h2><Link to="/catalogo" className="link">Seguir comprando</Link></div><p className="titulo__lead">Revisa cantidades y elige: pídelo por WhatsApp o paga en línea y recíbelo en casa.</p></div>
        <div className="cot">
          <div className="cot__lista">
            <table>
              <thead><tr><th></th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.image && <img src={i.image} alt="" />}</td>
                    <td><strong>{i.name}</strong><br /><small className="muted">{i.sku} · por {i.unit}</small></td>
                    <td>
                      <div className="cantidad">
                        <button type="button" onClick={() => setQty(i.id, i.qty - 1)} aria-label="Menos">−</button>
                        <input id={`q-${i.id}`} type="number" min="1" value={i.qty} onChange={(e) => setQty(i.id, Number(e.target.value))} aria-label="Cantidad" />
                        <button type="button" onClick={() => setQty(i.id, i.qty + 1)} aria-label="Más">+</button>
                      </div>
                    </td>
                    <td className="num">{money(i.final_price)}</td>
                    <td className="num"><strong>{money(i.qty * i.final_price)}</strong></td>
                    <td><button className="cot__quitar" onClick={() => remove(i.id)} aria-label={`Quitar ${i.name}`}><Icon name="trash" size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="cot__nota">Precios con IVA incluido. Si un producto se agota antes de despachar, te avisamos y te devolvemos la diferencia.</p>
          </div>

          <div className="cot__resumen">
            <dl className="cot__desglose num">
              <div><dt>Subtotal</dt><dd>{money(b.base)}</dd></div>
              <div><dt>IVA {ivaPct} %</dt><dd>{money(b.tax)}</dd></div>
              <div className="cot__tot"><dt>Total</dt><dd>{money(b.total)}</dd></div>
            </dl>
            <button type="button" className="btn btn--wa btn--lg" onClick={sendWhatsApp} disabled={!!busy}><WhatsAppIcon /> {busy === 'whatsapp' ? 'Abriendo WhatsApp…' : 'Pedir todo esto por WhatsApp'}</button>
            <p className="cot__ayuda">Tu lista completa le llega a {contact.whatsapp_name || 'nuestro equipo'} por WhatsApp. Te llama para confirmar stock, coordinar la entrega y <b>darte un descuento directo por volumen</b>.</p>

            {cardEnabled && (<>
              <span className="cot__o">o paga en línea y recíbelo en casa</span>
              {belowMin ? (
                <p className="cot__min">La entrega a domicilio con pago en línea es para pedidos desde <b className="num">{money(minDelivery)}</b>. A tu carrito le faltan <b className="num">{money(minDelivery - b.total)}</b>; agrega más productos o pídelo por WhatsApp.</p>
              ) : (
              <form className="cot__form" onSubmit={(e) => { e.preventDefault(); payCard() }}>
                <p className="cot__ayuda">Pagas con tarjeta y te lo llevamos a la dirección que marques en el mapa.</p>
                <label className="campo">Nombre<input id="c-nombre" value={form.customer_name} onChange={set('customer_name')} placeholder="Tu nombre" autoComplete="name" /></label>
                <label className="campo">Teléfono<input id="c-tel" type="tel" value={form.phone} onChange={set('phone')} placeholder="0991234567" autoComplete="tel" /></label>
                <label className="campo">Correo (opcional)<input id="c-mail" type="email" value={form.email} onChange={set('email')} placeholder="tu@correo.com" autoComplete="email" /></label>
                <div className="campo"><span>¿Dónde lo entregamos?</span><MapPicker value={point} onChange={setPoint} center={{ lat: Number(contact.lat) || -3.96285, lng: Number(contact.lng) || -79.21454 }} /></div>
                <label className="campo">Referencia de la dirección<input id="c-dir" value={form.address} onChange={set('address')} placeholder="Barrio, calle, casa o referencia" /></label>
                <label className="campo">Comentario (opcional)<textarea id="c-msg" rows="2" value={form.notes} onChange={set('notes')} placeholder="Ej.: entregar el lunes en la mañana" /></label>
                {error && <p className="error">{error}</p>}
                <button className="btn btn--lg" disabled={!!busy}><Icon name="card" /> {busy === 'tarjeta' ? 'Preparando pago…' : `Pagar ${money(b.total)} con tarjeta`}</button>
                <p className="cot__seguro"><Icon name="lock" size={14} /> Pago seguro con PayPhone · Visa, Mastercard, Diners y más</p>
              </form>
              )}
            </>)}
          </div>
        </div>
      </div>
    </section>
  )
}
