import { createContext, useContext, useEffect, useState } from 'react'
import * as auth from '../services/auth'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = cargando
  useEffect(() => {
    auth.currentUser().then(setUser).catch(() => setUser(null))
    return auth.onAuthChange(setUser)
  }, [])
  const value = {
    user, loading: user === undefined, isAdmin: auth.isAdmin(user),
    signIn: async (e, p) => setUser(await auth.signIn(e, p)),
    signOut: async () => { await auth.signOut(); setUser(null) },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
