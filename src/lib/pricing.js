/** Misma lógica que las funciones SQL public.product_pricing_qty y public.product_volume_tiers.
 *  Se usa en modo demo y para previsualizar promociones en el panel sin ir a la base de datos. */
export const marginPct = (cost, price) =>
  price > 0 ? Math.round(((price - cost) / price) * 10000) / 100 : 0

/** Cantidad mínima de una promoción: 1 = aplica siempre; > 1 = descuento por volumen. */
export const minQty = (promo) => Math.max(1, Math.floor(Number(promo?.min_qty) || 1))

/** ¿La promoción alcanza a este producto llevando `qty` unidades? */
export function promotionApplies(promo, product, now = new Date(), qty = 1) {
  if (!promo.is_active) return false
  if (promo.starts_at && new Date(promo.starts_at) > now) return false
  if (promo.ends_at && new Date(promo.ends_at) < now) return false
  if (promo.scope === 'category' && promo.category_id !== product.category_id) return false
  if (promo.scope === 'product' && promo.product_id !== product.id) return false
  if (promo.min_margin_pct != null && marginPct(product.cost, product.price) < Number(promo.min_margin_pct)) return false
  if (minQty(promo) > qty) return false
  return true
}

/** Precio con el descuento tal cual, sin proteger el margen. */
export function rawDiscountedPrice(promo, product) {
  const price = Number(product.price)
  const candidate = promo.discount_type === 'percent'
    ? price * (1 - Number(promo.discount_value) / 100)
    : price - Number(promo.discount_value)
  return Math.max(0, Math.round(candidate * 100) / 100)
}

/** Precio con el descuento, recortado para no bajar del margen a proteger. */
export function applyPromotion(promo, product) {
  const cost = Number(product.cost || 0)
  let candidate = rawDiscountedPrice(promo, product)
  if (promo.keep_margin_pct != null && cost > 0) {
    const floor = Math.round((cost / (1 - Number(promo.keep_margin_pct) / 100)) * 100) / 100
    if (candidate < floor) candidate = floor
  }
  return Math.max(0, candidate)
}

/** Mejor promoción y precio final de un producto llevando `qty` unidades. */
export function bestPromotion(product, promotions = [], qty = 1, now = new Date()) {
  const price = Number(product.price)
  let best = null, bestPromo = null
  const sorted = [...promotions].sort((a, b) => (b.priority || 0) - (a.priority || 0))
  for (const promo of sorted) {
    if (!promotionApplies(promo, product, now, qty)) continue
    const candidate = applyPromotion(promo, product)
    if (candidate < price && (best == null || candidate < best)) { best = candidate; bestPromo = promo }
  }
  return { final_price: best ?? price, promo: bestPromo }
}

/** Escalones de precio por volumen: [{ min_qty, unit_price, promotion_id, promotion_name, badge }].
 *  Solo los que mejoran el precio unitario y el del escalón anterior. */
export function volumeTiers(product, promotions = [], now = new Date()) {
  let prev = bestPromotion(product, promotions, 1, now).final_price
  const qtys = [...new Set(
    promotions.filter((pr) => minQty(pr) > 1 && promotionApplies(pr, product, now, minQty(pr))).map(minQty),
  )].sort((a, b) => a - b)
  const tiers = []
  for (const q of qtys) {
    const r = bestPromotion(product, promotions, q, now)
    if (r.final_price < prev) {
      tiers.push({ min_qty: q, unit_price: r.final_price, promotion_id: r.promo?.id ?? null, promotion_name: r.promo?.name ?? null, badge: r.promo?.badge ?? null })
      prev = r.final_price
    }
  }
  return tiers
}

/** Producto con precio final, promoción aplicada y escalones por volumen (como la vista catalog_public). */
export function priceProduct(product, promotions = [], qty = 1) {
  const price = Number(product.price)
  const { final_price, promo: bestPromo } = bestPromotion(product, promotions, qty)
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
    volume_tiers: volumeTiers(product, promotions),
  }
}

/** Precio unitario que paga el cliente llevando `qty` unidades de un producto del catálogo
 *  (usa final_price y volume_tiers tal como vienen de catalog_public o de priceProduct). */
export function unitPriceFor(product, qty = 1) {
  const tiers = [...(product.volume_tiers || [])].sort((a, b) => a.min_qty - b.min_qty)
  const tier = [...tiers].reverse().find((t) => qty >= t.min_qty) || null
  const next_tier = tiers.find((t) => qty < t.min_qty) || null
  const unit_price = tier ? Number(tier.unit_price) : Number(product.final_price)
  return { unit_price, tier, next_tier, list_price: Number(product.price) }
}

export const money = (n) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(n || 0))

/** "saco" → "sacos", "unidad" → "unidades"; en singular si n es 1. */
export const plural = (unit, n) => (n === 1 ? unit : /[aeiouáéíóú]$/i.test(unit || '') ? `${unit}s` : `${unit}es`)
