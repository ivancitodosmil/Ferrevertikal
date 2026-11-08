import { useEffect, useState, useCallback } from 'react'

/** Carga datos asíncronos con estados de carga/error y función para recargar. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const run = useCallback(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn().then((data) => alive && setState({ data, loading: false, error: null }))
        .catch((error) => alive && setState({ data: null, loading: false, error }))
    return () => { alive = false }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(run, [run])
  return { ...state, reload: run }
}
