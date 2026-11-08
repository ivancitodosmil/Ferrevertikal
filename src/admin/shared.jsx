export function MargenChip({ v }) {
  const n = Number(v || 0)
  const cls = n < 15 ? 'margen--bajo' : n < 30 ? 'margen--medio' : 'margen--alto'
  return <span className={`margen num ${cls}`}>{n.toFixed(1)} %</span>
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box" role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin__head"><h2>{title}</h2><button className="btn btn--outline btn--sm" onClick={onClose}>Cerrar</button></div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({ text, onYes, onNo }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onNo()}>
      <div className="modal__box" style={{ width: 'min(100%, 440px)' }} role="alertdialog">
        <p>{text}</p>
        <div className="row"><button className="btn" style={{ '--bg': 'var(--alerta)' }} onClick={onYes}>Sí, eliminar</button><button className="btn btn--outline" onClick={onNo}>Cancelar</button></div>
      </div>
    </div>
  )
}

export const toLocalInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')
