import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  // Variables que llegan al navegador: las propias (VITE_) y las públicas que crea la
  // integración Supabase ↔ Vercel (NEXT_PUBLIC_). Nunca SUPABASE_* ni POSTGRES_*: esas son secretas.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
