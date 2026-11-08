// Íconos de línea para categorías y acciones (SVG inline, sin dependencias)
const paths = {
  cemento:      <><path d="M4 9h16l-1.5 11h-13z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/><path d="M6 13h12"/></>,
  hierro:       <><path d="M3 7l18 10"/><path d="M3 11l18 10"/><path d="M3 15l12 6"/><path d="M9 3l12 6"/></>,
  herramientas: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2.1-2.1z"/></>,
  materiales:   <><rect x="3" y="4" width="8" height="7"/><rect x="13" y="4" width="8" height="7"/><rect x="8" y="13" width="8" height="7"/></>,
  pinturas:     <><rect x="3" y="4" width="14" height="5"/><path d="M17 6h4v5h-6"/><path d="M10 9v4"/><rect x="8" y="13" width="4" height="7"/></>,
  electricos:   <><path d="M13 2L5 13h6l-1 9 8-12h-6z"/></>,
  plomeria:     <><path d="M4 10h8V4"/><path d="M12 10v10"/><path d="M4 10v4"/><path d="M12 14h8"/><circle cx="20" cy="14" r="2"/></>,
  cubiertas:    <><path d="M2 12l10-8 10 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  truck:        <><path d="M1 7h13v10H1z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  plus:         <><path d="M12 5v14M5 12h14"/></>,
  search:       <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
  check:        <><path d="M4 12l5 5L20 7"/></>,
  trash:        <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></>,
  edit:         <><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M12 6l4 4"/></>,
  list:         <><rect x="5" y="3" width="14" height="18"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  sun:          <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon:         <><path d="M21 13.5A8.5 8.5 0 0 1 10.5 3a7 7 0 1 0 10.5 10.5z"/></>,
  prev:         <><path d="M15 6l-6 6 6 6"/></>,
  next:         <><path d="M9 6l6 6-6 6"/></>,
  pause:        <><path d="M9 5v14M15 5v14"/></>,
  play:         <><path d="M8 5l11 7-11 7z"/></>,
  pin:          <><path d="M12 22s7-7.2 7-12a7 7 0 0 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></>,
  clock:        <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  mail:         <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
  phone:        <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></>,
  chat:         <><path d="M4 5h16v11H8l-4 4z"/></>,
  instagram:    <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></>,
  cart:         <><path d="M3 4h2l2.4 11h11.2L21 8H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></>,
  card:         <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></>,
  lock:         <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  star:         <><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></>,
}

export default function Icon({ name, size = 24, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths[name] || paths.materiales}
    </svg>
  )
}

export const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>
)
