import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { unitPriceFor } from '../lib/pricing'

// Carrito de compras: se guarda en el navegador y se envía como pedido (WhatsApp o pago con tarjeta).
// Cada línea guarda el precio unitario normal (final_price) y los escalones de precio por volumen
// (volume_tiers) tal como vienen del catálogo; el precio que se cobra depende de la cantidad.
const Ctx = createContext(null)
const KEY = 'fv-carrito'
const round2 = (n) => Math.round(n * 100) / 100

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || JSON.parse(localStorage.getItem('fv-cotizacion')) || [] } catch { return [] }
  })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch {} }, [items])

  const api = useMemo(() => {
    // Precio unitario y total de cada línea según su cantidad (aplica el escalón por volumen si lo alcanza)
    const priced = items.map((i) => {
      const r = unitPriceFor(i, i.qty)
      return { ...i, unit_price: r.unit_price, line_total: round2(i.qty * r.unit_price), tier: r.tier, next_tier: r.next_tier }
    })
    return {
      items: priced,
      count: priced.reduce((n, i) => n + i.qty, 0),
      total: round2(priced.reduce((n, i) => n + i.line_total, 0)),
      add: (p, qty = 1) => setItems((cur) => {
        const found = cur.find((i) => i.id === p.id)
        if (found) return cur.map((i) => (i.id === p.id ? { ...i, qty: i.qty + qty } : i))
        return [...cur, {
          id: p.id, name: p.name, sku: p.sku, unit: p.unit, price: p.price, final_price: p.final_price,
          promotion_name: p.promotion_name || null, volume_tiers: p.volume_tiers || [], image: p.images?.[0]?.url, qty,
        }]
      }),
      setQty: (id, qty) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.floor(qty) || 1) } : i))),
      remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
      clear: () => setItems([]),
      /** Refresca precios y escalones por volumen con los datos vigentes del catálogo. */
      sync: (rows) => setItems((cur) => cur.map((i) => {
        const r = (rows || []).find((x) => x.id === i.id)
        if (!r) return i
        return { ...i, name: r.name, unit: r.unit, price: r.price, final_price: r.final_price, promotion_name: r.promotion_name || null, volume_tiers: r.volume_tiers || [], image: r.images?.[0]?.url ?? i.image }
      })),
    }
  }, [items])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useCart = () => useContext(Ctx)
