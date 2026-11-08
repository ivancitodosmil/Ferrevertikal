import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { money } from '../lib/pricing'
import { breakdown, newOrderCode, whatsappMessage, waLink, DEFAULT_IVA, DELIVERY } from '../lib/orders'
import { createOrder, listProductsByIds } from '../services/catalog'
import { useSettings } from '../components/Layout'
import Icon, { WhatsAppIcon } from '../components/Icons'
import { isDemo } from '../lib/supabase'
import MapPicker from '../components/MapPicker'

export default function Cart() {
  const { items, total, setQty, remove, clear, sync } = useCart()
  const { contact = {}, payments = {} } = useSettings()
  const nav = useNavigate()
  const ivaPct = Number(payments.iva_pct ?? DEFAULT_IVA)
  const b = breakdown(total, ivaPct)
  const cardEnabled = !!payments.enabled || isDemo // en demo se muestra una simulación del pago
  const codEnabled = payments.cod_enabled ?? true   // "Pagar al recibir" (contraentrega)
  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', delivery: 'entrega', address: '', notes: '' })
  const minDelivery = Number(payments.min_delivery) || 0
  const belowMin = minDelivery > 0 && b.total < minDelivery
  const [point, setPoint] = useState(null) // { lat, lng } del punto de entrega
  const [busy, setBusy] = useState(null) // 'whatsapp' | 'contraentrega' | 'tarjeta'
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null) // pedido registrado (WhatsApp o pago al recibir)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const who = contact.whatsapp_name || 'nuestro equipo'
  const isEntrega = form.delivery === 'entrega'

  // Al abrir el carrito se refrescan precios y escalones por volumen con el catálogo vigente
  useEffect(() => {
    const ids = items.map((i) => i.id)
    if (ids.length) listProductsByIds(ids).then(sync).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildOrder = (channel) => ({
    code: newOrderCode(), ...form, channel,
    address: isEntrega ? form.address : '',
    delivery_lat: isEntrega && point ? point.lat : null, delivery_lng: isEntrega && point ? point.lng : null,
    status: channel === 'tarjeta' ? 'pendiente_pago' : 'nuevo',
    // price = precio unitario cobrado (ya con descuento o precio por volumen); list_price = precio de lista
    items: items.map(({ id, name, sku, unit, qty, unit_price, price, tier, promotion_name }) => ({
      id, name, sku, unit, qty, price: Number(unit_price), list_price: Number(price), promotion: tier?.promotion_name || promotion_name || null,
    })),
    subtotal: b.base, tax: b.tax, total: b.total,
  })

  const valid = (needPoint) => {
    if (!form.customer_name.trim() || !form.phone.trim()) { setError('Escribe tu nombre y un teléfono para poder llamarte.'); return false }
    if (needPoint && !point) { setError('Marca en el mapa dónde quieres recibir tu pedido.'); return false }
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

  // Pago al recibir: se registra el pedido con los datos del cliente y la tienda lo llama para confirmar.
  const payOnDelivery = async () => {
    if (!valid(isEntrega)) return
    setBusy('contraentrega')
    try {
      const order = await createOrder(buildOrder('contraentrega'))
      clear(); setDone(order)
    } catch { setError('No pudimos registrar el pedido. Intenta de nuevo o pídelo por WhatsApp.') }
    finally { setBusy(null) }
  }

  const payCard = async () => {
    if (!valid(true)) return
    setBusy('tarjeta')
    try {
      const order = await createOrder(buildOrder('tarjeta'))
      nav(`/pago/${order.code}`)
    } catch (ex) { setError('No pudimos registrar el pedido. Intenta de nuevo o pídelo por WhatsApp.'); setBusy(null) }
  }

  if (done) {
    const cod = done.channel === 'contraentrega'
    const aviso = `Hola, acabo de hacer el pedido ${done.code} en la web para pagar al recibir. ¿Me confirman?`
    return (
      <section className="section"><div className="wrap"><div className="vacio">
        <h3>Pedido {done.code} {cod ? 'registrado' : 'enviado'}</h3>
        <p className="muted">{cod
          ? `${who} te llamará al ${done.phone} para confirmar stock, total y ${done.delivery === 'retiro' ? 'cuándo retirarlo en bodega' : 'la hora de entrega'}. Pagas al recibir tu pedido.`
          : 'Se abrió WhatsApp con el detalle de tu pedido. Te confirmamos stock, total y hora de entrega por ese mismo chat.'}</p>
        <div className="row">
          <a className="btn btn--wa" href={waLink(contact.whatsapp, cod ? aviso : whatsappMessage(done, ivaPct))} target="_blank" rel="noreferrer"><WhatsAppIcon /> {cod ? 'Avisar por WhatsApp' : 'Abrir WhatsApp de nuevo'}</a>
          <Link to="/catalogo" className="btn btn--outline">Seguir comprando</Link>
        </div>
      </div></div></section>
    )
  }

  if (!items.length) return (
    <section className="section"><div className="wrap"><div className="vacio">
      <h3>Tu carrito está vacío</h3>
      <p className="muted">Agrega productos desde el catálogo. Lo pides por WhatsApp, pagas al recibir o pagas en línea.</p>
      <Link to="/catalogo" className="btn">Ir al catálogo</Link>
    </div></div></section>
  )

  return (
    <section className="section--tight">
      <div className="wrap">
        <div className="titulo"><div className="titulo__row"><h2>Tu carrito</h2><Link to="/catalogo" className="link">Seguir comprando</Link></div><p className="titulo__lead">Revisa cantidades y elige cómo pedir: por WhatsApp, pagando al recibir o en línea con tarjeta.</p></div>
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
                    <td className="num">
                      {money(i.unit_price)}
                      {i.unit_price < Number(i.price) && <><br /><s className="muted">{money(i.price)}</s></>}
                      {i.tier && <small className="cot__tier">{i.tier.promotion_name || 'Precio por volumen'} · desde {i.tier.min_qty}</small>}
                      {i.next_tier && <small className="cot__next">Desde {i.next_tier.min_qty}: {money(i.next_tier.unit_price)} c/u</small>}
                    </td>
                    <td className="num"><strong>{money(i.line_total)}</strong></td>
                    <td><button className="cot__quitar" onClick={() => remove(i.id)} aria-label={`Quitar ${i.name}`}><Icon name="trash" size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="cot__nota">{ivaPct > 0 ? 'Precios con IVA incluido. ' : 'Precios finales. '}Los precios por volumen se aplican solos al llegar a la cantidad. Si un producto se agota antes de despachar, te avisamos y te devolvemos la diferencia.</p>
          </div>

          <div className="cot__resumen">
            <dl className="cot__desglose num">
              {ivaPct > 0 && (<>
                <div><dt>Subtotal</dt><dd>{money(b.base)}</dd></div>
                <div><dt>IVA {ivaPct} %</dt><dd>{money(b.tax)}</dd></div>
              </>)}
              <div className="cot__tot"><dt>Total</dt><dd>{money(b.total)}</dd></div>
            </dl>
            <button type="button" className="btn btn--wa btn--lg" onClick={sendWhatsApp} disabled={!!busy}><WhatsAppIcon /> {busy === 'whatsapp' ? 'Abriendo WhatsApp…' : 'Pedir todo esto por WhatsApp'}</button>
            <p className="cot__ayuda">Tu lista completa le llega a {who} por WhatsApp. Te llama para confirmar stock, coordinar la entrega y <b>darte un descuento directo por volumen</b>.</p>

            {(codEnabled || cardEnabled) && (<>
              <span className="cot__o">o déjanos tus datos y te llamamos</span>
              <form className="cot__form" onSubmit={(e) => e.preventDefault()}>
                <label className="campo">Nombre<input id="c-nombre" value={form.customer_name} onChange={set('customer_name')} placeholder="Tu nombre" autoComplete="name" /></label>
                <label className="campo">Teléfono<input id="c-tel" type="tel" value={form.phone} onChange={set('phone')} placeholder="0991234567" autoComplete="tel" /></label>
                <label className="campo">Correo (opcional)<input id="c-mail" type="email" value={form.email} onChange={set('email')} placeholder="tu@correo.com" autoComplete="email" /></label>
                <div className="campo"><span>¿Cómo lo recibes?</span>
                  <div className="opciones">
                    <label className={`opcion ${isEntrega ? 'active' : ''}`}><input type="radio" name="delivery" value="entrega" checked={isEntrega} onChange={set('delivery')} /> {DELIVERY.entrega}</label>
                    <label className={`opcion ${!isEntrega ? 'active' : ''}`}><input type="radio" name="delivery" value="retiro" checked={!isEntrega} onChange={set('delivery')} /> {DELIVERY.retiro}</label>
                  </div>
                </div>
                {isEntrega && (<>
                  <div className="campo"><span>¿Dónde lo entregamos?</span><MapPicker value={point} onChange={setPoint} center={{ lat: Number(contact.lat) || -3.96285, lng: Number(contact.lng) || -79.21454 }} /></div>
                  <label className="campo">Referencia de la dirección<input id="c-dir" value={form.address} onChange={set('address')} placeholder="Barrio, calle, casa o referencia" /></label>
                </>)}
                <label className="campo">Comentario (opcional)<textarea id="c-msg" rows="2" value={form.notes} onChange={set('notes')} placeholder="Ej.: entregar el lunes en la mañana" /></label>
                {error && <p className="error">{error}</p>}

                {codEnabled && (<>
                  <button type="button" className="btn btn--lg" onClick={payOnDelivery} disabled={!!busy}><Icon name="check" /> {busy === 'contraentrega' ? 'Registrando pedido…' : 'Pagar al recibir'}</button>
                  <p className="cot__ayuda">Registramos tu pedido y {who} te llama para confirmarlo. Pagas cuando lo recibas{isEntrega ? ' en tu obra' : ' en bodega'}, en efectivo o por transferencia.</p>
                </>)}

                {cardEnabled && isEntrega && (belowMin ? (
                  <p className="cot__min">El pago en línea con entrega a domicilio es para pedidos desde <b className="num">{money(minDelivery)}</b>. A tu carrito le faltan <b className="num">{money(minDelivery - b.total)}</b>; puedes pagar al recibir o pedirlo por WhatsApp.</p>
                ) : (<>
                  {codEnabled && <span className="cot__o">o paga ahora en línea</span>}
                  <button type="button" className={`btn btn--lg ${codEnabled ? 'btn--outline' : ''}`} onClick={payCard} disabled={!!busy}><Icon name="card" /> {busy === 'tarjeta' ? 'Preparando pago…' : `Pagar ${money(b.total)} con tarjeta`}</button>
                  <p className="cot__seguro"><Icon name="lock" size={14} /> Pago seguro con PayPhone · Visa, Mastercard, Diners y más</p>
                </>))}
              </form>
            </>)}
          </div>
        </div>
      </div>
    </section>
  )
}
