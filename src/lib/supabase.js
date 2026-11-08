import { createClient } from '@supabase/supabase-js'

// Credenciales públicas del proyecto. Se aceptan las variables propias (VITE_, ver .env.example)
// y las que crea automáticamente la integración Supabase ↔ Vercel (NEXT_PUBLIC_).
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Cliente de Supabase. Es `null` cuando no hay credenciales:
 *  en ese caso la web funciona en modo demostración con datos locales. */
export const supabase = url && key ? createClient(url, key) : null
export const isDemo = !supabase
export const BUCKET = 'product-images'
