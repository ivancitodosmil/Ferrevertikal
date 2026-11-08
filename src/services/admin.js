import { supabase, BUCKET } from '../lib/supabase'
import { priceProduct } from '../lib/pricing'
import * as seed from '../data/seed'

// ---------- Servicios del panel de administración ----------
// Todas las escrituras pasan por RLS: solo usuarios con rol admin/superadmin.
// Sin Supabase trabajan en memoria (modo demostración, se pierde al recargar).

const demo = {
  categories: [...seed.categories],
  products: seed.products.map((p) => ({ ...p })),
  images: seed.products.flatMap((p) => p.images.map((i, n) => ({ ...i, id: `${p.id}-${n}`, product_id: p.id, sort_order: n }))),
  promotions: [...seed.promotions],
  settings: JSON.parse(JSON.stringify(seed.settings)),
  orders: seed.orders,
  messages: seed.messages,
}
const uid = () => Math.random().toString(36).slice(2, 10)

// ----- Productos -----
export async function adminListProducts() {
  if (!supabase) {
    const cats = Object.fromEntries(demo.categories.map((c) => [c.id, c]))
    return demo.products.map((p) => ({
      ...priceProduct(p, demo.promotions),
      category_name: cats[p.category_id]?.name,
      images: demo.images.filter((i) => i.product_id === p.id).sort((a, b) => b.is_primary - a.is_primary || a.sort_order - b.sort_order),
    }))
  }
  const { data, error } = await supabase.from('catalog_admin').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveProduct(values) {
  const row = {
    category_id: values.category_id || null,
    name: values.name, slug: values.slug || null, sku: values.sku || null, brand: values.brand || null,
    description: values.description || null, unit: values.unit || 'unidad',
    cost: Number(values.cost || 0), price: Number(values.price || 0), stock: Number(values.stock || 0),
    is_active: !!values.is_active, is_featured: !!values.is_featured,
  }
  if (!supabase) {
    if (values.id) { const i = demo.products.findIndex((p) => p.id === values.id); demo.products[i] = { ...demo.products[i], ...row }; return demo.products[i] }
    const p = { ...row, id: uid(), slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), images: [] }
    demo.products.unshift(p); return p
  }
  const q = values.id
    ? supabase.from('products').update(row).eq('id', values.id)
    : supabase.from('products').insert(row)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  if (!supabase) { demo.products = demo.products.filter((p) => p.id !== id); return }
  const { data: imgs } = await supabase.from('product_images').select('path').eq('product_id', id)
  const paths = (imgs || []).map((i) => i.path).filter(Boolean)
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ----- Imágenes (Storage) -----
export async function uploadProductImage(productId, file, { isPrimary = false } = {}) {
  if (!supabase) {
    const url = URL.createObjectURL(file)
    const img = { id: uid(), product_id: productId, url, path: null, alt: file.name, is_primary: isPrimary, sort_order: demo.images.length }
    if (isPrimary) demo.images.forEach((i) => { if (i.product_id === productId) i.is_primary = false })
    demo.images.push(img); return img
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${productId}/${Date.now()}-${uid()}.${ext}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const { data, error } = await supabase.from('product_images')
    .insert({ product_id: productId, path, url: pub.publicUrl, alt: file.name, is_primary: isPrimary })
    .select().single()
  if (error) throw error
  return data
}

export async function addImageByUrl(productId, url, isPrimary = false) {
  if (!supabase) { const img = { id: uid(), product_id: productId, url, path: null, is_primary: isPrimary, sort_order: demo.images.length }; demo.images.push(img); return img }
  const { data, error } = await supabase.from('product_images').insert({ product_id: productId, url, is_primary: isPrimary }).select().single()
  if (error) throw error
  return data
}

export async function setPrimaryImage(image) {
  if (!supabase) { demo.images.forEach((i) => { if (i.product_id === image.product_id) i.is_primary = i.id === image.id }); return }
  const { error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', image.id)
  if (error) throw error
}

export async function deleteImage(image) {
  if (!supabase) { demo.images = demo.images.filter((i) => i.id !== image.id); return }
  if (image.path) await supabase.storage.from(BUCKET).remove([image.path])
  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error
}

// ----- Categorías -----
export async function adminListCategories() {
  if (!supabase) return demo.categories
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  if (error) throw error
  return data
}
export async function saveCategory(values) {
  const row = { name: values.name, slug: values.slug || null, description: values.description || null, icon: values.icon || null, sort_order: Number(values.sort_order || 0), is_active: !!values.is_active }
  if (!supabase) {
    if (values.id) { const i = demo.categories.findIndex((c) => c.id === values.id); demo.categories[i] = { ...demo.categories[i], ...row }; return demo.categories[i] }
    const c = { ...row, id: uid(), slug: row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }; demo.categories.push(c); return c
  }
  const q = values.id ? supabase.from('categories').update(row).eq('id', values.id) : supabase.from('categories').insert(row)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}
export async function deleteCategory(id) {
  if (!supabase) { demo.categories = demo.categories.filter((c) => c.id !== id); return }
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ----- Promociones -----
export async function adminListPromotions() {
  if (!supabase) return demo.promotions
  const { data, error } = await supabase.from('promotions').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function savePromotion(values) {
  const row = {
    name: values.name, badge: values.badge || null, description: values.description || null,
    discount_type: values.discount_type, discount_value: Number(values.discount_value || 0),
    scope: values.scope,
    category_id: values.scope === 'category' ? values.category_id || null : null,
    product_id: values.scope === 'product' ? values.product_id || null : null,
    min_margin_pct: values.min_margin_pct === '' || values.min_margin_pct == null ? null : Number(values.min_margin_pct),
    keep_margin_pct: values.keep_margin_pct === '' || values.keep_margin_pct == null ? null : Number(values.keep_margin_pct),
    starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : new Date().toISOString(),
    ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
    is_active: !!values.is_active, priority: Number(values.priority || 0),
  }
  if (!supabase) {
    if (values.id) { const i = demo.promotions.findIndex((p) => p.id === values.id); demo.promotions[i] = { ...demo.promotions[i], ...row }; return demo.promotions[i] }
    const p = { ...row, id: uid() }; demo.promotions.unshift(p); return p
  }
  const q = values.id ? supabase.from('promotions').update(row).eq('id', values.id) : supabase.from('promotions').insert(row)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}
export async function deletePromotion(id) {
  if (!supabase) { demo.promotions = demo.promotions.filter((p) => p.id !== id); return }
  const { error } = await supabase.from('promotions').delete().eq('id', id)
  if (error) throw error
}

// ----- Pedidos -----
export async function adminListOrders() {
  if (!supabase) return demo.orders
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function setOrderStatus(id, status) {
  if (!supabase) { const o = demo.orders.find((x) => x.id === id); if (o) o.status = status; return }
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

// ----- Mensajes de contacto -----
export async function adminListMessages() {
  if (!supabase) return demo.messages
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function setMessageStatus(id, status) {
  if (!supabase) { const m = demo.messages.find((x) => x.id === id); if (m) m.status = status; return }
  const { error } = await supabase.from('messages').update({ status }).eq('id', id)
  if (error) throw error
}

// ----- Configuración -----
export async function adminGetSettings() {
  if (!supabase) return demo.settings
  const { data, error } = await supabase.from('site_settings').select('key, value')
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.key, r.value]))
}
export async function saveSetting(key, value) {
  if (!supabase) { demo.settings[key] = value; return }
  const { error } = await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ----- Usuarios (solo superadmin) -----
export async function adminListProfiles() {
  if (!supabase) return [{ id: 'demo', email: 'admin@ferrevertikal.com', full_name: 'Super Admin (demo)', role: 'superadmin' }]
  const { data, error } = await supabase.from('profiles').select('*').order('created_at')
  if (error) throw error
  return data
}
export async function setUserRole(email, role) {
  if (!supabase) return
  const { error } = await supabase.rpc('set_user_role', { p_email: email, p_role: role })
  if (error) throw error
}
