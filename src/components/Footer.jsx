import { Link } from 'react-router-dom'
import { useSettings } from './Layout'

export default function Footer() {
  const { contact = {} } = useSettings()
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div>
            <div className="footer__logo"><img src="/images/logo.png" alt="Ferre Vertikal G&L" /></div>
            <p>Ferretería y materiales de construcción. Tu proyecto, nuestro compromiso.</p>
          </div>
          <div>
            <h4>Tienda</h4>
            <ul>
              <li><Link to="/catalogo">Catálogo completo</Link></li>
              <li><Link to="/promociones">Promociones</Link></li>
              <li><Link to="/carrito">Mi carrito</Link></li>
            </ul>
          </div>
          <div>
            <h4>Categorías</h4>
            <ul>
              <li><Link to="/catalogo/cemento">Cemento</Link></li>
              <li><Link to="/catalogo/hierro">Hierro</Link></li>
              <li><Link to="/catalogo/electricos">Eléctricos</Link></li>
              <li><Link to="/catalogo/pinturas">Pinturas</Link></li>
            </ul>
          </div>
          <div>
            <h4>Visítanos</h4>
            <ul>
              <li>{contact.address}</li>
              <li>{contact.hours}</li>
              <li>{contact.phone}</li>
              <li>{contact.email}</li>
            </ul>
          </div>
        </div>
        <div className="footer__bot">
          <span>© {new Date().getFullYear()} Ferre Vertikal G&L. Todos los derechos reservados.</span>
          <Link to="/admin">Administración</Link>
        </div>
      </div>
    </footer>
  )
}
