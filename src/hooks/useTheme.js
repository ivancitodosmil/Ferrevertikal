import { useEffect, useState } from 'react'

const KEY = 'fv-theme'
function initial() {
  try { const v = localStorage.getItem(KEY); if (v === 'dark' || v === 'light') return v } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Tema claro/oscuro: se guarda por visitante y por defecto sigue al sistema. */
export function useTheme() {
  const [theme, setTheme] = useState(initial)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(KEY, theme) } catch {}
  }, [theme])
  return { theme, isDark: theme === 'dark', toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}
