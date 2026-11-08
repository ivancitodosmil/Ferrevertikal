import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import Product from './pages/Product'
import Promotions from './pages/Promotions'
import Contact from './pages/Contact'
import Cart from './pages/Cart'
import Pay, { PayResult } from './pages/Pay'
import AdminLayout from './admin/AdminLayout'
import Login from './admin/Login'
import Dashboard from './admin/Dashboard'
import ProductsAdmin from './admin/ProductsAdmin'
import CategoriesAdmin from './admin/CategoriesAdmin'
import PromotionsAdmin from './admin/PromotionsAdmin'
import OrdersAdmin from './admin/OrdersAdmin'
import SettingsAdmin from './admin/SettingsAdmin'
import { CartProvider } from './hooks/useCart'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
       <ToastProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="/catalogo/:category" element={<Catalog />} />
            <Route path="/producto/:slug" element={<Product />} />
            <Route path="/promociones" element={<Promotions />} />
            <Route path="/contacto" element={<Contact />} />
            <Route path="/carrito" element={<Cart />} />
            <Route path="/cotizacion" element={<Navigate to="/carrito" replace />} />
            <Route path="/pago/respuesta" element={<PayResult />} />
            <Route path="/pago/:code" element={<Pay />} />
          </Route>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="productos" element={<ProductsAdmin />} />
            <Route path="categorias" element={<CategoriesAdmin />} />
            <Route path="promociones" element={<PromotionsAdmin />} />
            <Route path="pedidos" element={<OrdersAdmin />} />
            <Route path="cotizaciones" element={<Navigate to="/admin/pedidos" replace />} />
            <Route path="configuracion" element={<SettingsAdmin />} />
          </Route>
        </Routes>
       </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}
