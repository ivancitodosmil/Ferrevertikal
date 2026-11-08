import { supabase } from '../lib/supabase'
import { priceProduct } from '../lib/pricing'
import * as seed from '../data/seed'

// ---------- Lectura pública (web) ----------
// En producción consulta la vista catalog_public (ya trae precio final y promoción).
// Sin Supabase, calcula lo mismo en el navegador con los datos de ejemplo.

function demoCatalog() {
  const cats = Object.fromEntries(seed.categories.map((c) => [c.id, c]))
  return seed.products
    .filter((p) => p.is_active)
    .map((p) => ({ ...priceProduct(p, seed.promotions), category_name: cats[p.category_id]?.name, category_slug: cats[p.category_id]?.slug }))
}

export async function listCategories() {
  if (!supabase) return seed.categories
  const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
  if (error) throw error
  return data
}

export async function listProducts({ category, search, featured, limit } = {}) {
  if (!supabase) {
    let rows = demoCatalog()
    if (category) rows = rows.filter((p) => p.category_slug === category)
    if (featured) rows = rows.filter((p) => p.is_featured)
    if (search) { const q = search.toLowerCase(); rows = rows.filter((p) => `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(q)) }
    return limit ? rows.slice(0, limit) : rows
  }
  let q = supabase.from('catalog_public').select('*').order('is_featured', { ascending: false }).order('name')
  if (category) q = q.eq('category_slug', category)
  if (featured) q = q.eq('is_featured', true)
  if (search) q = q.or(`name.ilike.%${search}%,brand.ilike.%${search}%,sku.ilike.%${search}%`)
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getProduct(slug) {
  if (!supabase) return demoCatalog().find((p) => p.slug === slug) ?? null
  const { data, error } = await supabase.from('catalog_public').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function listPromotedProducts() {
  const rows = await listProducts()
  return rows.filter((p) => p.discount_pct > 0)
}

export async function listActivePromotions() {
  if (!supabase) return seed.promotions
  const { data, error } = await supabase.from('promotions_public').select('*')
  if (error) throw error
  return data
}

export async function getSettings() {
  if (!supabase) return seed.settings
  const { data, error } = await supabase.from('site_settings').select('key, value')
  if (error) throw error
  const out = { ...seed.settings }
  for (const row of data) out[row.key] = { ...(out[row.key] || {}), ...row.value }
  return out
}

// ---------- Pedidos (carrito) ----------
const PUBLIC_ORDER = 'id, code, customer_name, phone, delivery, address, delivery_lat, delivery_lng, items, subtotal, tax, total, channel, status, payment, created_at'

export async function createOrder(order) {
  if (!supabase) {
    const row = { ...order, id: String(Date.now()), created_at: new Date().toISOString() }
    seed.orders.unshift(row)
    return row
  }
  const { data, error } = await supabase.from('orders').insert(order).select(PUBLIC_ORDER).single()
  if (error) throw error
  return data
}

export async function getOrder(code) {
  if (!supabase) return seed.orders.find((o) => o.code === code) || null
  const { data, error } = await supabase.rpc('get_order_public', { p_code: code })
  if (error) throw error
  return data?.[0] || data || null
}

/** Confirma el pago con PayPhone desde la base de datos (función SQL con el token del comercio).
 *  Si la verificación automática no está disponible, deja el pedido como "pago por verificar". */
export async function confirmPayment(code, payphoneId) {
  if (!supabase) {
    const o = seed.orders.find((x) => x.code === code)
    if (o) { o.status = 'pagado'; o.payment = { provider: 'payphone', transaction_id: payphoneId, authorization_code: 'DEMO123', card_brand: 'Visa', last_digits: '4242', confirmed_at: new Date().toISOString() } }
    return o
  }
  const { data, error } = await supabase.rpc('confirm_order_payment', { p_code: code, p_payphone_id: Number(payphoneId) })
  if (error) throw error
  return data?.[0] || data || null
}

// ---------- Mensajes del formulario de contacto ----------
export async function sendMessage(msg) {
  if (!supabase) { seed.messages.unshift({ ...msg, id: String(Date.now()), status: 'nuevo', created_at: new Date().toISOString() }); return true }
  const { error } = await supabase.from('messages').insert(msg)
  if (error) throw error
  return true
}
