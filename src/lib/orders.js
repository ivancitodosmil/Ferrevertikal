import { money } from './pricing'

/** IVA vigente en Ecuador (15 % desde abril de 2024). Se cambia desde Configuración → Pagos;
 *  con 0 no se desglosa nada: los precios se tratan como finales (venta sin factura). */
export const DEFAULT_IVA = 15

/** Los precios del catálogo incluyen IVA: desglosa base imponible e impuesto en centavos. */
export function breakdown(total, ivaPct = DEFAULT_IVA) {
  const totalCents = Math.round(Number(total) * 100)
  const baseCents = Math.round(totalCents / (1 + Number(ivaPct) / 100))
  const taxCents = totalCents - baseCents
  return { totalCents, baseCents, taxCents, total: totalCents / 100, base: baseCents / 100, tax: taxCents / 100 }
}

/** Código legible y único para el pedido, p. ej. FV-M8K2Q1-7XKD (sirve como clientTransactionId en PayPhone). */
export function newOrderCode() {
  const t = Date.now().toString(36).toUpperCase().slice(-6)
  const r = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
  return `FV-${t}-${r}`
}

export const DELIVERY = { retiro: 'Retiro en bodega', entrega: 'Entrega en obra' }

/** Canal por el que entró el pedido. */
export const CHANNEL = { whatsapp: 'WhatsApp', tarjeta: 'Tarjeta', contraentrega: 'Pago al recibir' }

export const ORDER_STATUS = {
  nuevo: 'Nuevo', pendiente_pago: 'Pendiente de pago', pagado: 'Pagado', pago_por_verificar: 'Pago por verificar',
  pago_fallido: 'Pago rechazado', en_preparacion: 'En preparación', entregado: 'Entregado', cancelado: 'Cancelado',
}

/** Mensaje de WhatsApp con el detalle del pedido. */
export function whatsappMessage(order, ivaPct = DEFAULT_IVA) {
  const b = breakdown(order.total, ivaPct)
  const lines = order.items.map((i) => `• ${i.qty} ${i.unit} × ${i.name} — ${money(i.qty * i.price)}${i.promotion ? ` (${i.promotion}: ${money(i.price)} c/u)` : ''}`)
  const parts = [
    `Hola, quiero pedir estos productos (pedido ${order.code}):`, '', ...lines, '',
    ...(ivaPct > 0 ? [`Subtotal: ${money(b.base)}`, `IVA ${ivaPct} %: ${money(b.tax)}`] : []),
    `*Total: ${money(b.total)}*`, '',
  ]
  if (order.customer_name && order.customer_name !== 'Cliente por WhatsApp') parts.push(`Nombre: ${order.customer_name}`)
  if (order.phone) parts.push(`Teléfono: ${order.phone}`)
  if (order.address) parts.push(`${DELIVERY[order.delivery] || 'Entrega'}: ${order.address}`)
  if (order.delivery_lat != null && order.delivery_lng != null) parts.push(`Punto de entrega: ${mapsLink(order.delivery_lat, order.delivery_lng)}`)
  else if (order.delivery === 'retiro' && order.customer_name !== 'Cliente por WhatsApp') parts.push(DELIVERY.retiro)
  if (order.notes) parts.push(`Nota: ${order.notes}`)
  parts.push('¿Me confirman disponibilidad y si hay descuento por el volumen? Gracias.')
  return parts.join('\n')
}

export const waLink = (number, text) => `https://wa.me/${String(number || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`

export const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`
