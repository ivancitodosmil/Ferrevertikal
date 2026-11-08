import { supabase } from '../lib/supabase'

const DEMO_KEY = 'fv-demo-session'

export async function signIn(email, password) {
  if (!supabase) {
    // Modo demo: cualquier correo con la clave "demo" entra como superadmin
    if (password !== 'demo') throw new Error('En modo demostración la contraseña es "demo".')
    const user = { id: 'demo', email, profile: { role: 'superadmin', full_name: 'Super Admin (demo)' } }
    localStorage.setItem(DEMO_KEY, JSON.stringify(user)); return user
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return withProfile(data.user)
}

export async function signOut() {
  if (!supabase) { localStorage.removeItem(DEMO_KEY); return }
  await supabase.auth.signOut()
}

export async function currentUser() {
  if (!supabase) { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) } catch { return null } }
  const { data } = await supabase.auth.getUser()
  return data.user ? withProfile(data.user) : null
}

export function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange(async (_e, session) => cb(session?.user ? await withProfile(session.user) : null))
  return () => data.subscription.unsubscribe()
}

async function withProfile(user) {
  const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  return { ...user, profile: data || { role: 'customer' } }
}

export const isAdmin = (user) => ['admin', 'superadmin'].includes(user?.profile?.role)
