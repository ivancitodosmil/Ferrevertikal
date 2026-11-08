import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../hooks/useCart'
import SearchBox from './SearchBox'
import { useSettings } from './Layout'
import Icon from './Icons'
import { useTheme } from '../hooks/useTheme'

const links = [
  ['/', 'Inicio'], ['/catalogo', 'Catálogo'], ['/promociones', 'Promociones'], ['/contacto', 'Contacto'],
]

export default function Header() {
  const { count } = useCart()
  const { contact = {} } = useSettings()
  const [open, setOpen] = useState(false)
  const { isDark, toggle } = useTheme()
  const wa = `https://wa.me/${contact.whatsapp || ''}`
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span>{contact.hours || 'Lunes a sábado 7:30 – 18:00'}</span>
          <span>Pedidos y consultas: <a href={wa} target="_blank" rel="noreferrer"><strong>{contact.phone || '+593 99 706 9684'}</strong></a></span>
        </div>
      </div>
      <header className="header">
        <div className="wrap">
          <Link to="/" className="header__logo" aria-label="Ferre Vertikal G&L, inicio">
            <img src="/images/logo.png" alt="Ferre Vertikal G&L" />
          </Link>
          <SearchBox id="buscar-header" />
          <nav className="nav" aria-label="Principal">
            {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
          </nav>
          <button className="theme" onClick={toggle} aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'} title={isDark ? 'Tema claro' : 'Tema oscuro'}>
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
          <Link to="/carrito" className="btn btn--carbon btn--sm header__quote" aria-label={`Carrito, ${count} productos`}>
            <Icon name="cart" size={18} /><span className="txt">Carrito</span>
            {count > 0 && <span className="cnt num">{count}</span>}
          </Link>
          <button className="burger" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
        <div className="drawer" hidden={!open}>
          <SearchBox id="buscar-drawer" onDone={() => setOpen(false)} />
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>{label}</NavLink>)}
          <NavLink to="/carrito" onClick={() => setOpen(false)}>Carrito {count > 0 && `(${count})`}</NavLink>
        </div>
      </header>
    </>
  )
}
