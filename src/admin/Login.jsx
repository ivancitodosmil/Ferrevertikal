import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isDemo } from '../lib/supabase'

export default function Login() {
  const { user, isAdmin, signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  if (user && isAdmin) return <Navigate to="/admin" replace />
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null)
    try { await signIn(email, password); nav('/admin') }
    catch (ex) { setErr(ex.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : ex.message) }
    finally { setBusy(false) }
  }
  return (
    <div className="login">
      <form className="login__box" onSubmit={submit}>
        <img src="/images/logo.png" alt="Ferre Vertikal G&L" />
        <h2 style={{ textAlign: 'center' }}>Panel de administración</h2>
        {isDemo && <p className="aviso">Modo demostración: ingresa cualquier correo y la contraseña <strong>demo</strong>.</p>}
        {user && !isAdmin && <p className="error">Tu cuenta no tiene permisos de administrador.</p>}
        <label className="campo">Correo<input id="l-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label className="campo">Contraseña<input id="l-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {err && <p className="error">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  )
}
