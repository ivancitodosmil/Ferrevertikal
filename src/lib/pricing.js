/** Misma lógica que la función SQL public.product_pricing, para el modo demo
 *  y para previsualizar promociones en el panel sin ir a la base de datos. */
export const marginPct = (cost, price) =>
  price > 0 ? Math.round(((price - cost) / price) * 10000) / 100 : 0

export function promotionApplies(promo, product, now = new Date()) {
  if (!promo.is_active) return false
  if (promo.starts_at && new Date(promo.starts_at) > now) return false
  if (promo.ends_at && new Date(promo.ends_at) < now) return false
  if (promo.scope === 'category' && promo.category_id !== product.category_id) return false
  if (promo.scope === 'product' && promo.product_id !== product.id) return false
  if (promo.min_margin_pct != null && marginPct(product.cost, product.price) < Number(promo.min_margin_pct)) return false
  return true
}

export function applyPromotion(promo, product) {
  const price = Number(product.price), cost = Number(product.cost || 0)
  let candidate = promo.discount_type === 'percent'
    ? Math.round(price * (1 - Number(promo.discount_value) / 100) * 100) / 100
    : Math.round((price - Number(promo.discount_value)) * 100) / 100
  if (promo.keep_margin_pct != null && cost > 0) {
    const floor = Math.round((cost / (1 - Number(promo.keep_margin_pct) / 100)) * 100) / 100
    if (candidate < floor) candidate = floor
  }
  return Math.max(0, candidate)
}

export function priceProduct(product, promotions = []) {
  const price = Number(product.price)
  let best = null, bestPromo = null
  const sorted = [...promotions].sort((a, b) => (b.priority || 0) - (a.priority || 0))
  for (const promo of sorted) {
    if (!promotionApplies(promo, product)) continue
    const candidate = applyPromotion(promo, product)
    if (candidate < price && (best == null || candidate < best)) { best = candidate; bestPromo = promo }
  }
  const final_price = best ?? price
  return {
    ...product,
    final_price,
    promotion_id: bestPromo?.id ?? null,
    promotion_name: bestPromo?.name ?? null,
    badge: bestPromo?.badge ?? null,
    discount_type: bestPromo?.discount_type ?? null,
    discount_value: bestPromo?.discount_value ?? null,
    discount_pct: final_price < price ? Math.round(((price - final_price) / price) * 100) : 0,
    margin_pct: marginPct(Number(product.cost || 0), price),
    final_margin_pct: marginPct(Number(product.cost || 0), final_price),
  }
}

export const money = (n) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(n || 0))
