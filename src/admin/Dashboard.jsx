import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { adminListProducts, adminListPromotions, adminListOrders } from '../services/admin'
import { money } from '../lib/pricing'
import { MargenChip } from './shared'

export default function Dashboard() {
  const prods = useAsync(adminListProducts, [])
  const promos = useAsync(adminListPromotions, [])
  const orders = useAsync(adminListOrders, [])
  const P = prods.data || []
  const lowMargin = P.filter((p) => p.margin_pct < 15)
  const lowStock = P.filter((p) => p.stock <= 10)
  return (
    <>
      <div className="admin__head"><h1>Resumen</h1><Link to="/admin/productos" className="btn btn--sm">Nuevo producto</Link></div>
      <div className="kpis">
        <div className="kpi"><strong className="num">{P.length}</strong><span>productos</span></div>
        <div className="kpi"><strong className="num">{P.filter((p) => p.promotion_id).length}</strong><span>con promoción activa</span></div>
        <div className="kpi"><strong className="num">{(promos.data || []).filter((p) => p.is_active).length}</strong><span>promociones activas</span></div>
        <div className="kpi"><strong className="num">{(orders.data || []).filter((o) => ['nuevo', 'pagado', 'pago_por_verificar'].includes(o.status)).length}</strong><span>pedidos por atender</span></div>
        <div className="kpi"><strong className="num">{money((orders.data || []).filter((o) => ['pagado', 'en_preparacion', 'entregado'].includes(o.status) && o.channel === 'tarjeta').reduce((n, o) => n + Number(o.total), 0))}</strong><span>cobrado con tarjeta</span></div>
      </div>
      <div className="grid grid--2">
        <div className="panel">
          <h3>Margen bajo (menos de 15 %)</h3>
          {lowMargin.length === 0 ? <p className="muted">Todos los productos tienen margen saludable.</p> : (
            <table className="tabla"><tbody>{lowMargin.map((p) => <tr key={p.id}><td>{p.name}</td><td className="num">{money(p.price)}</td><td><MargenChip v={p.margin_pct} /></td></tr>)}</tbody></table>
          )}
        </div>
        <div className="panel">
          <h3>Stock bajo (10 o menos)</h3>
          {lowStock.length === 0 ? <p className="muted">Sin alertas de stock.</p> : (
            <table className="tabla"><tbody>{lowStock.map((p) => <tr key={p.id}><td>{p.name}</td><td className="num">{p.stock} {p.unit}</td></tr>)}</tbody></table>
          )}
        </div>
      </div>
    </>
  )
}
