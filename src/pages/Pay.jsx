import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getOrder, confirmPayment } from '../services/catalog'
import { useSettings } from '../components/Layout'
import { money } from '../lib/pricing'
import { breakdown, DEFAULT_IVA, DELIVERY, whatsappMessage, waLink, mapsLink } from '../lib/orders'
import { isDemo } from '../lib/supabase'
import { WhatsAppIcon } from '../components/Icons'

const PP_CSS = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css'
const PP_JS = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js'

/** Carga la "Cajita de Pagos" de PayPhone una sola vez y espera a que exista el constructor. */
function loadPayPhone() {
  if (window.PPaymentButtonBox) return Promise.resolve()
  if (!document.querySelector(`link[href="${PP_CSS}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = PP_CSS; document.head.appendChild(l) }
  if (!document.querySelector(`script[src="${PP_JS}"]`)) { const s = document.createElement('script'); s.type = 'module'; s.src = PP_JS; document.head.appendChild(s) }
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const tick = () => { if (window.PPaymentButtonBox) resolve(); else if (Date.now() - t0 > 15000) reject(new Error('timeout')); else setTimeout(tick, 150) }
    tick()
  })
}

function Resumen({ order, ivaPct }) {
  const b = breakdown(order.total, ivaPct)
  return (
    <div className="pago__resumen">
      <h3>Pedido <span className="num">{order.code}</span></h3>
      <ul className="pago__items">
        {order.items.map((i, n) => <li key={n}><span>{i.qty} {i.unit} × {i.name}</span><b className="num">{money(i.qty * i.price)}</b></li>)}
      </ul>
      <dl className="cot__desglose num">
        {ivaPct > 0 && (<>
          <div><dt>Subtotal</dt><dd>{money(b.base)}</dd></div>
          <div><dt>IVA {ivaPct} %</dt><dd>{money(b.tax)}</dd></div>
        </>)}
        <div className="cot__tot"><dt>Total</dt><dd>{money(b.total)}</dd></div>
      </dl>
      <p className="muted">{order.customer_name} · {order.phone}<br />{DELIVERY[order.delivery]}{order.address ? `: ${order.address}` : ''}{order.delivery_lat != null && <> · <a href={mapsLink(order.delivery_lat, order.delivery_lng)} target="_blank" rel="noreferrer">punto en el mapa</a></>}</p>
    </div>
  )
}

/** /pago/:code — muestra la cajita de PayPhone para pagar el pedido. */
export default function Pay() {
  const { code } = useParams()
  const { payments = {} } = useSettings()
  const ivaPct = Number(payments.iva_pct ?? DEFAULT_IVA)
  const [order, setOrder] = useState(undefined)
  const [state, setState] = useState('loading') // loading | ready | error
  const box = useRef(null)

  useEffect(() => { getOrder(code).then(setOrder).catch(() => setOrder(null)) }, [code])

  useEffect(() => {
    if (!order || order.status !== 'pendiente_pago') return
    if (isDemo || !payments.token) { setState('ready'); return }
    let cancelled = false
    loadPayPhone().then(() => {
      if (cancelled) return
      const b = breakdown(order.total, ivaPct)
      box.current.innerHTML = ''
      new window.PPaymentButtonBox({
        token: payments.token,
        storeId: payments.store_id || undefined,
        clientTransactionId: order.code,
        amount: b.totalCents,
        // con IVA: base gravada + impuesto; sin IVA (0): todo el monto va como no gravado
        ...(b.taxCents > 0 ? { amountWithTax: b.baseCents, tax: b.taxCents } : { amountWithoutTax: b.totalCents }),
        currency: 'USD', lang: 'es', timeZone: -5, defaultMethod: 'card',
        reference: `Ferre Vertikal pedido ${order.code}`,
        phoneNumber: order.phone ? '+593' + String(order.phone).replace(/\D/g, '').replace(/^593/, '').replace(/^0/, '') : undefined,
        email: order.email || undefined,
      }).render('pp-button')
      setState('ready')
    }).catch(() => setState('error'))
    return () => { cancelled = true }
  }, [order, payments.token, payments.store_id, ivaPct])

  if (order === undefined) return <section className="section"><div className="wrap"><p className="estado">Cargando tu pedido…</p></div></section>
  if (order === null) return <section className="section"><div className="wrap"><div className="vacio"><h3>No encontramos ese pedido</h3><Link to="/carrito" className="btn">Volver al carrito</Link></div></div></section>
  if (order.status !== 'pendiente_pago') return <PayResultView order={order} ivaPct={ivaPct} />

  return (
    <section className="section--tight"><div className="wrap">
      <div className="titulo"><h2>Pagar con tarjeta</h2><p className="titulo__lead">Tus datos de tarjeta los procesa PayPhone, nosotros no los vemos ni guardamos.</p></div>
      <div className="pago">
        <div className="pago__caja">
          {isDemo || !payments.token ? <DemoBox order={order} ivaPct={ivaPct} /> : (
            <>
              {state === 'loading' && <p className="estado">Cargando el formulario de pago…</p>}
              {state === 'error' && <p className="error">No se pudo cargar PayPhone. Revisa tu conexión o pide el pedido por WhatsApp.</p>}
              <div id="pp-button" ref={box} />
            </>
          )}
          <p className="cot__nota">El formulario de pago caduca a los 10 minutos. Si se vence, vuelve al carrito y genera el pedido otra vez.</p>
        </div>
        <Resumen order={order} ivaPct={ivaPct} />
      </div>
    </div></section>
  )
}

/** Simulación para el modo demostración (sin credenciales de PayPhone). */
function DemoBox({ order, ivaPct }) {
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const pay = async () => { setBusy(true); const o = await confirmPayment(order.code, Date.now()); setRes(o); setBusy(false) }
  if (res) return <PayResultView order={res} ivaPct={ivaPct} inline />
  return (
    <div className="pago__demo">
      <p className="aviso">Modo demostración: aquí aparece la cajita de PayPhone cuando se configure el token en el panel (Configuración → Pagos).</p>
      <div className="campo"><span>Número de tarjeta</span><input value="4242 4242 4242 4242" readOnly /></div>
      <div className="row"><div className="campo" style={{ flex: 1 }}><span>Vence</span><input value="12/28" readOnly /></div><div className="campo" style={{ flex: 1 }}><span>CVV</span><input value="123" readOnly /></div></div>
      <button className="btn btn--lg btn--block" onClick={pay} disabled={busy}>{busy ? 'Procesando…' : `Simular pago de ${money(order.total)}`}</button>
    </div>
  )
}

/** /pago/respuesta?id=…&clientTransactionId=… — URL de respuesta registrada en PayPhone. */
export function PayResult() {
  const [params] = useSearchParams()
  const { payments = {} } = useSettings()
  const ivaPct = Number(payments.iva_pct ?? DEFAULT_IVA)
  const code = params.get('clientTransactionId'), id = params.get('id')
  const [order, setOrder] = useState(undefined)
  useEffect(() => {
    if (!code) { setOrder(null); return }
    const run = id ? confirmPayment(code, id) : getOrder(code)
    run.then(setOrder).catch(() => getOrder(code).then(setOrder).catch(() => setOrder(null)))
  }, [code, id])
  if (order === undefined) return <section className="section"><div className="wrap"><p className="estado">Verificando tu pago con PayPhone…</p></div></section>
  if (!order) return <section className="section"><div className="wrap"><div className="vacio"><h3>No encontramos el pedido</h3><Link to="/catalogo" className="btn">Ir al catálogo</Link></div></div></section>
  return <PayResultView order={order} ivaPct={ivaPct} />
}

function PayResultView({ order, ivaPct, inline }) {
  const { contact = {} } = useSettings()
  const ok = order.status === 'pagado' || order.status === 'en_preparacion' || order.status === 'entregado'
  const pending = order.status === 'pago_por_verificar'
  const pay = order.payment || {}
  const body = (
    <div className="pago__result">
      <div className={`pago__icon ${ok ? 'ok' : pending ? 'warn' : 'no'}`} aria-hidden="true">{ok ? '✓' : pending ? '…' : '✕'}</div>
      <h3>{ok ? '¡Pago aprobado!' : pending ? 'Pago recibido, en verificación' : order.status === 'pendiente_pago' ? 'Pago pendiente' : 'El pago no se completó'}</h3>
      <p className="muted">
        {ok && <>Gracias, {order.customer_name}. Tu pedido <b className="num">{order.code}</b> ya está en preparación. Te escribimos al {order.phone} para coordinar la {order.delivery === 'entrega' ? 'entrega en obra' : 'hora de retiro'}.</>}
        {pending && <>Registramos tu pago. Lo confirmamos en unos minutos y te avisamos por WhatsApp.</>}
        {!ok && !pending && <>No se realizó ningún cobro. Puedes intentar de nuevo o enviarnos el pedido por WhatsApp.</>}
      </p>
      {(ok || pending) && pay.transaction_id && (
        <dl className="specs" style={{ textAlign: 'left' }}>
          <div><dt>Transacción PayPhone</dt><dd className="num">{pay.transaction_id}</dd></div>
          {pay.authorization_code && <div><dt>Autorización</dt><dd className="num">{pay.authorization_code}</dd></div>}
          {pay.card_brand && <div><dt>Tarjeta</dt><dd>{pay.card_brand} •••• {pay.last_digits}</dd></div>}
          <div><dt>Total</dt><dd className="num">{money(order.total)}</dd></div>
        </dl>
      )}
      <div className="row" style={{ justifyContent: 'center' }}>
        {!ok && !pending && order.status === 'pendiente_pago' && <Link to={`/pago/${order.code}`} className="btn">Intentar de nuevo</Link>}
        <a className="btn btn--wa" href={waLink(contact.whatsapp, ok ? `Hola, acabo de pagar el pedido ${order.code} con tarjeta. ¿Me confirman la entrega?` : whatsappMessage({ ...order, items: order.items }, ivaPct))} target="_blank" rel="noreferrer"><WhatsAppIcon /> {ok ? 'Coordinar entrega' : 'Pedir por WhatsApp'}</a>
        <Link to="/catalogo" className="btn btn--outline">Seguir comprando</Link>
      </div>
    </div>
  )
  if (inline) return body
  return <section className="section"><div className="wrap wrap--narrow">{body}</div></section>
}
