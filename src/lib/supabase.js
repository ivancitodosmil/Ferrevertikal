import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Cliente de Supabase. Es `null` cuando no hay credenciales en .env:
 *  en ese caso la web funciona en modo demostración con datos locales. */
export const supabase = url && key ? createClient(url, key) : null
export const isDemo = !supabase
export const BUCKET = 'product-images'
