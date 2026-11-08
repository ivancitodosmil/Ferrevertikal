import { useState } from 'react'
import { useSettings } from '../components/Layout'
import { sendMessage } from '../services/catalog'
import MapView from '../components/MapView'
import Icon, { WhatsAppIcon } from '../components/Icons'

export default function Contact() {
  const { contact = {} } = useSettings()
  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', message: '' })
  const [state, setState] = useState('idle')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault(); setState('sending')
    try { await sendMessage(form); setState('ok'); setForm({ customer_name: '', phone: '', email: '', message: '' }) }
    catch { setState('error') }
  }
  const wa = `https://wa.me/${contact.whatsapp || ''}?text=${encodeURIComponent('Hola, quiero información de Ferre Vertikal')}`

  return (
    <div>
      <section className="section section--concreto">
        <div className="wrap contacto">
          <div className="contacto__intro">
            <h2>Hablemos de tu obra.<br /><em>Te respondemos hoy.</em></h2>
            <p className="muted">Cotizaciones, disponibilidad de stock y entregas. Escríbenos por el medio que prefieras o déjanos tu mensaje.</p>
            <div className="contacto__wa">
              <a className="btn btn--wa btn--lg" href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon /> Escribir por WhatsApp</a>
              <small className="muted">Te atiende {contact.whatsapp_name || 'nuestro equipo'} · respuesta en minutos en horario de atención</small>
            </div>
            <div className="ccards">
              <a className="ccard ccard--wa" href={wa} target="_blank" rel="noreferrer">
                <span className="ccard__lbl"><WhatsAppIcon /> WhatsApp</span>
                <span className="ccard__val">{contact.phone}</span>
                <span className="ccard__act">Chatear ahora</span>
              </a>
              <div className="ccard">
                <span className="ccard__lbl"><Icon name="clock" size={18} /> Horario</span>
                <span className="ccard__val">{contact.hours}</span>
                <span className="ccard__sub">Domingos cerrado</span>
              </div>
              <a className="ccard" href={`mailto:${contact.email}`}>
                <span className="ccard__lbl"><Icon name="mail" size={18} /> Correo</span>
                <span className="ccard__val">{contact.email}</span>
                <span className="ccard__act">Enviar correo</span>
              </a>
              <a className="ccard" href={contact.maps_url} target="_blank" rel="noreferrer">
                <span className="ccard__lbl"><Icon name="pin" size={18} /> Dirección</span>
                <span className="ccard__val">{contact.address}</span>
                <span className="ccard__act">Cómo llegar</span>
              </a>
            </div>
          </div>

          <form className="fcard" onSubmit={submit}>
            <div className="fcard__head">
              <h3>Escríbenos</h3>
              <p className="muted">Te contactamos en el transcurso del día laboral.</p>
            </div>
            <div className="form-grid">
              <label className="campo">Nombre<input id="c-nombre" required value={form.customer_name} onChange={set('customer_name')} placeholder="Tu nombre" /></label>
              <label className="campo">Teléfono<input id="c-tel" required value={form.phone} onChange={set('phone')} placeholder="0991234567" /></label>
              <label className="campo full">Correo (opcional)<input id="c-mail" type="email" value={form.email} onChange={set('email')} placeholder="tu@correo.com" /></label>
              <label className="campo full">¿Qué necesitas?<textarea id="c-msg" rows="5" required value={form.message} onChange={set('message')} placeholder="Ej.: 40 quintales de varilla de 12 mm para entrega el lunes" /></label>
            </div>
            {state === 'ok' && <p className="aviso">Mensaje enviado. Te contactamos en el transcurso del día.</p>}
            {state === 'error' && <p className="error">No se pudo enviar. Escríbenos por WhatsApp mientras lo solucionamos.</p>}
            <div className="fcard__foot">
              <small className="muted">Usamos tus datos únicamente para responder tu mensaje.</small>
              <div className="row">
                <a className="btn btn--outline btn--wa-outline" href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon /> Mejor por WhatsApp</a>
                <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar mensaje'}</button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {contact.lat != null && (
        <section className="section">
          <div className="wrap llegar">
            <div className="llegar__txt">
              <h2>Cómo llegar</h2>
              <p className="muted">{contact.address}. Sobre la Av. 8 de Diciembre, con espacio para que entre tu camioneta a cargar directo desde bodega.</p>
              <div><a className="link" href={contact.maps_url} target="_blank" rel="noreferrer">Abrir en Google Maps</a></div>
            </div>
            <div className="mapa-wrap"><MapView lat={Number(contact.lat)} lng={Number(contact.lng)} address={contact.address} height={460} /></div>
          </div>
        </section>
      )}
    </div>
  )
}
