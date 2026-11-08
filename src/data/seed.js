// Datos de demostración. Se usan solo cuando no hay credenciales de Supabase en .env.
// Son los mismos registros que inserta supabase/setup.sql.
export const categories = [
  { id: 'c1', name: 'Cemento',               slug: 'cemento',              icon: 'cemento',      sort_order: 1, is_active: true, description: 'Cemento, morteros y aditivos' },
  { id: 'c2', name: 'Hierro',                slug: 'hierro',               icon: 'hierro',       sort_order: 2, is_active: true, description: 'Varillas, mallas, perfiles y alambre' },
  { id: 'c3', name: 'Herramientas',          slug: 'herramientas',         icon: 'herramientas', sort_order: 3, is_active: true, description: 'Manuales y eléctricas' },
  { id: 'c4', name: 'Materiales para obra',  slug: 'materiales-para-obra', icon: 'materiales',   sort_order: 4, is_active: true, description: 'Bloques, arena, ripio, tubería' },
  { id: 'c5', name: 'Pinturas',              slug: 'pinturas',             icon: 'pinturas',     sort_order: 5, is_active: true, description: 'Pinturas, lacas, brochas y rodillos' },
  { id: 'c6', name: 'Eléctricos',            slug: 'electricos',           icon: 'electricos',   sort_order: 6, is_active: true, description: 'Cables, breakers, tomas e iluminación' },
  { id: 'c7', name: 'Plomería y sanitarios', slug: 'plomeria-sanitarios',  icon: 'plomeria',     sort_order: 7, is_active: true, description: 'Tubería PVC, griferías, inodoros y lavamanos' },
  { id: 'c8', name: 'Cubiertas',             slug: 'cubiertas',            icon: 'cubiertas',    sort_order: 8, is_active: true, description: 'Tejas PVC, planchas de zinc y policarbonato' },
]

const img = (url, alt) => [{ id: url, url, alt, is_primary: true }]

export const products = [
  { id: 'p1',  category_id: 'c8', name: 'Plancha tipo teja PVC 3.0 m',       slug: 'plancha-teja-pvc-3m',      sku: 'CUB-001', brand: 'Techolit',   unit: 'plancha', cost: 18.5, price: 26.9,  stock: 120, is_featured: true,  is_active: true, description: 'Plancha termoacústica tipo teja colonial, color terracota. Liviana, no se oxida y aísla el calor.', images: img('/images/teja-pvc.jpg', 'Teja PVC') },
  { id: 'p2',  category_id: 'c2', name: 'Varilla corrugada 12 mm x 12 m',     slug: 'varilla-corrugada-12mm',   sku: 'HIE-012', brand: 'Adelca',     unit: 'varilla', cost: 11.2, price: 14.4,  stock: 400, is_featured: true,  is_active: true, description: 'Acero de refuerzo grado 42 para columnas y vigas.', images: img('/images/bodega-hierro.jpg', 'Varillas') },
  { id: 'p3',  category_id: 'c2', name: 'Malla electrosoldada 15x15 6 mm',    slug: 'malla-electrosoldada-6mm', sku: 'HIE-020', brand: 'Adelca',     unit: 'panel',   cost: 52,   price: 64.9,  stock: 35,  is_featured: false, is_active: true, description: 'Panel de 2.40 x 6.25 m para losas y contrapisos.', images: img('/images/camion-varillas.jpg', 'Malla') },
  { id: 'p4',  category_id: 'c1', name: 'Cemento Portland tipo GU 50 kg',     slug: 'cemento-portland-50kg',    sku: 'CEM-050', brand: '',           unit: 'saco',    cost: 7.1,  price: 8.6,   stock: 600, is_featured: true,  is_active: true, description: 'Saco de 50 kg para uso general en obra.', images: img('/images/bodega-frente.jpg', 'Cemento') },
  { id: 'p5',  category_id: 'c6', name: 'Breaker termomagnético 1P 20 A',     slug: 'breaker-1p-20a',           sku: 'ELE-120', brand: 'Siemens',    unit: 'unidad',  cost: 3.4,  price: 5.9,   stock: 90,  is_featured: true,  is_active: true, description: 'Protección para circuitos residenciales, montaje en riel.', images: img('/images/breaker.jpg', 'Breaker') },
  { id: 'p6',  category_id: 'c3', name: 'Cerradura de pomo acero inoxidable', slug: 'cerradura-pomo-inox',      sku: 'HER-310', brand: 'Orso',       unit: 'unidad',  cost: 6.8,  price: 11.5,  stock: 48,  is_featured: false, is_active: true, description: 'Cerradura de pomo con llave para puertas interiores y de baño.', images: img('/images/cerradura.jpg', 'Cerradura') },
  { id: 'p7',  category_id: 'c7', name: 'Tanque de agua 1 100 L',             slug: 'tanque-agua-1100l',        sku: 'PLO-110', brand: 'Plastigama', unit: 'unidad',  cost: 98,   price: 129,   stock: 14,  is_featured: true,  is_active: true, description: 'Tanque de polietileno con tapa, apto para agua potable.', images: img('/images/bodega-tanques.jpg', 'Tanques') },
  { id: 'p8',  category_id: 'c7', name: 'Inodoro one piece blanco',           slug: 'inodoro-one-piece',        sku: 'PLO-200', brand: 'Edesa',      unit: 'unidad',  cost: 78,   price: 119,   stock: 9,   is_featured: false, is_active: true, description: 'Inodoro de una pieza, descarga doble, incluye asiento.', images: img('/images/sanitarios.jpg', 'Sanitarios') },
  { id: 'p9',  category_id: 'c5', name: 'Pintura látex interior 1 galón',     slug: 'pintura-latex-galon',      sku: 'PIN-001', brand: 'Cóndor',     unit: 'galón',   cost: 12.3, price: 17.9,  stock: 70,  is_featured: false, is_active: true, description: 'Pintura lavable para interiores, acabado mate. Colores a pedido.', images: img('/images/pasillo-pinturas.jpg', 'Pinturas') },
  { id: 'p10', category_id: 'c4', name: 'Tubo PVC desagüe 110 mm x 3 m',      slug: 'tubo-pvc-110mm',           sku: 'MAT-110', brand: 'Plastigama', unit: 'tubo',    cost: 8.9,  price: 12.4,  stock: 150, is_featured: false, is_active: true, description: 'Tubería sanitaria de PVC para desagües.', images: img('/images/bodega-pvc.jpg', 'Tubería PVC') },
]

export const promotions = [
  { id: 'pr1', name: 'Semana del constructor', badge: '-10 %', description: 'Descuento en productos seleccionados', discount_type: 'percent', discount_value: 10, scope: 'all', category_id: null, product_id: null, min_margin_pct: 30, keep_margin_pct: 20, priority: 1, is_active: true, starts_at: '2024-01-01T00:00:00Z', ends_at: null },
]

export const settings = {
  contact: {
    whatsapp: '593997069684', whatsapp_name: 'Mónica', phone: '+593 99 706 9684', email: 'ventas@ferrevertikal.com',
    address: 'Av. 8 de Diciembre, junto a la Clínica Nataly, Loja', hours: 'Lunes a sábado 7:30 – 18:00',
    instagram: '@ferrevertikal', maps_url: 'https://www.google.com/maps/search/?api=1&query=Ferromarket+Le%C3%B3n+Av.+8+de+Diciembre+Loja', lat: -3.96285, lng: -79.21454,
  },
  home: {
    tagline: 'Tu proyecto, nuestro compromiso',
    headline: 'Todo para tu obra, en un solo lugar.',
    delivery_note: 'Entregamos en obra con nuestros camiones.',
  },
  payments: {
    // Pago con tarjeta mediante PayPhone (Ecuador). Se configura desde el panel → Configuración → Pagos.
    enabled: false, provider: 'payphone', token: '', store_id: '', iva_pct: 15,
    min_delivery: 50, // monto mínimo (USD) para compra en línea con entrega a domicilio
  },
}

// Pedidos del modo demostración (se pierden al recargar)
export const orders = [
  { id: 'o1', code: 'FV-DEMO01-A1B2', customer_name: 'María Jaramillo', phone: '0991234567', email: '', delivery: 'entrega',
    address: 'Barrio La Argelia, calle Buenos Aires', notes: 'Entregar en la mañana', channel: 'whatsapp', status: 'nuevo',
    items: [{ id: 'p4', name: 'Cemento Portland 50 kg', sku: 'CEM-050', unit: 'saco', qty: 20, price: 8.1 }],
    subtotal: 140.87, tax: 21.13, total: 162, payment: null, created_at: new Date(Date.now() - 36e5).toISOString() },
  { id: 'o2', code: 'FV-DEMO02-C3D4', customer_name: 'Carlos Ordóñez', phone: '0987654321', email: 'carlos@ejemplo.com', delivery: 'retiro',
    address: '', notes: '', channel: 'tarjeta', status: 'pendiente_pago',
    items: [{ id: 'p1', name: 'Plancha tipo teja PVC 3.0 m', sku: 'CUB-001', unit: 'plancha', qty: 12, price: 24.21 }, { id: 'p4', name: 'Cemento Portland 50 kg', sku: 'CEM-050', unit: 'saco', qty: 10, price: 8.1 }],
    subtotal: 323.06, tax: 48.46, total: 371.52, payment: null, created_at: new Date(Date.now() - 12e5).toISOString() },
]

export const messages = []
