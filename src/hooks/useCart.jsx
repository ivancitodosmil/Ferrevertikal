import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Carrito de compras: se guarda en el navegador y se envía como pedido (WhatsApp o pago con tarjeta).
const Ctx = createContext(null)
const KEY = 'fv-carrito'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || JSON.parse(localStorage.getItem('fv-cotizacion')) || [] } catch { return [] }
  })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch {} }, [items])

  const api = useMemo(() => ({
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    total: Math.round(items.reduce((n, i) => n + i.qty * Number(i.final_price), 0) * 100) / 100,
    add: (p, qty = 1) => setItems((cur) => {
      const found = cur.find((i) => i.id === p.id)
      if (found) return cur.map((i) => (i.id === p.id ? { ...i, qty: i.qty + qty } : i))
      return [...cur, { id: p.id, name: p.name, sku: p.sku, unit: p.unit, final_price: p.final_price, price: p.price, image: p.images?.[0]?.url, qty }]
    }),
    setQty: (id, qty) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.floor(qty) || 1) } : i))),
    remove: (id) => setItems((cur) => cur.filter((i) => i.id !== id)),
    clear: () => setItems([]),
  }), [items])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useCart = () => useContext(Ctx)
