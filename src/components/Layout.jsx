import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { useAsync } from '../hooks/useAsync'
import { getSettings } from '../services/catalog'
import { WhatsAppIcon } from './Icons'
import { createContext, useContext } from 'react'

export const SettingsCtx = createContext({})
export const useSettings = () => useContext(SettingsCtx)

export default function Layout() {
  const { data } = useAsync(getSettings, [])
  const settings = data || {}
  const wa = settings.contact?.whatsapp
  return (
    <SettingsCtx.Provider value={settings}>
      <Header />
      <main><Outlet /></main>
      <Footer />
      {wa && (
        <a className="wa" href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola, quiero información de Ferre Vertikal')}`} target="_blank" rel="noreferrer" aria-label="Escribir por WhatsApp">
          <WhatsAppIcon />
        </a>
      )}
    </SettingsCtx.Provider>
  )
}
