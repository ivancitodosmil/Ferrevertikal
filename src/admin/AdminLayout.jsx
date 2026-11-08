import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isDemo } from '../lib/supabase'

const nav = [
  ['/admin', 'Resumen', true], ['/admin/productos', 'Productos'], ['/admin/categorias', 'Categorías'],
  ['/admin/promociones', 'Promociones'], ['/admin/pedidos', 'Pedidos'], ['/admin/configuracion', 'Configuración'],
]

export default function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth()
  if (loading) return <p className="estado">Verificando sesión…</p>
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />
  return (
    <div className="admin">
      <aside className="admin__side">
        <div className="logo"><img src="/images/logo.png" alt="Ferre Vertikal" /></div>
        <nav className="admin__nav">
          {nav.map(([to, label, end]) => <NavLink key={to} to={to} end={!!end}>{label}</NavLink>)}
          <NavLink to="/" style={{ marginTop: 12, color: '#ffb37f' }}>← Ver la tienda</NavLink>
        </nav>
        <div className="admin__user">
          {isDemo && <span className="chip chip--naranja">Modo demostración (sin Supabase)</span>}
          <span>{user.profile?.full_name || user.email}<br /><small className="muted">{user.profile?.role}</small></span>
          <button className="btn btn--blanco btn--sm" onClick={signOut}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="admin__main"><Outlet /></main>
    </div>
  )
}
