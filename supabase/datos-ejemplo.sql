-- =====================================================================
--  Ferre Vertikal G&L — DATOS DE EJEMPLO (opcional)
--
--  Ejecútalo en el SQL Editor de Supabase DESPUÉS de setup.sql si quieres ver
--  el sitio con categorías, productos y una promoción de muestra.
--  No lo ejecutes en una base que ya tiene tus productos reales.
--  Es idempotente: no duplica lo que ya existe (busca por slug / nombre).
--  Para quitar las muestras usa el bloque "Limpieza" del final.
-- =====================================================================

insert into public.categories (name, slug, icon, sort_order, description) values
  ('Cemento',             'cemento',             'cemento',       1, 'Cemento, morteros y aditivos'),
  ('Hierro',              'hierro',              'hierro',        2, 'Varillas, mallas, perfiles y alambre'),
  ('Herramientas',        'herramientas',        'herramientas',  3, 'Manuales y eléctricas'),
  ('Materiales para obra','materiales-para-obra','materiales',    4, 'Bloques, arena, ripio, tubería'),
  ('Pinturas',            'pinturas',            'pinturas',      5, 'Pinturas, lacas, brochas y rodillos'),
  ('Eléctricos',          'electricos',          'electricos',    6, 'Cables, breakers, tomas e iluminación'),
  ('Plomería y sanitarios','plomeria-sanitarios','plomeria',      7, 'Tubería PVC, griferías, inodoros y lavamanos'),
  ('Cubiertas',           'cubiertas',           'cubiertas',     8, 'Tejas PVC, planchas de zinc y policarbonato')
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, sku, brand, description, unit, cost, price, stock, is_featured) values
  ((select id from public.categories where slug='cubiertas'),   'Plancha tipo teja PVC 3.0 m',       'plancha-teja-pvc-3m',     'CUB-001', 'Techolit',  'Plancha termoacústica tipo teja colonial, color terracota. Liviana, no se oxida y aísla el calor.', 'plancha', 18.50, 26.90, 120, true),
  ((select id from public.categories where slug='hierro'),      'Varilla corrugada 12 mm x 12 m',     'varilla-corrugada-12mm',  'HIE-012', 'Adelca',    'Acero de refuerzo grado 42 para columnas y vigas.', 'varilla', 11.20, 14.40, 400, true),
  ((select id from public.categories where slug='hierro'),      'Malla electrosoldada 15x15 6 mm',    'malla-electrosoldada-6mm','HIE-020', 'Adelca',    'Panel de 2.40 x 6.25 m para losas y contrapisos.', 'panel', 52.00, 64.90, 35, false),
  ((select id from public.categories where slug='cemento'),     'Cemento Portland tipo GU 50 kg',     'cemento-portland-50kg',   'CEM-050', null,    'Saco de 50 kg para uso general en obra.', 'saco', 7.10, 8.60, 600, true),
  ((select id from public.categories where slug='electricos'),  'Breaker termomagnético 1P 20 A',     'breaker-1p-20a',          'ELE-120', 'Siemens',   'Protección para circuitos residenciales, montaje en riel.', 'unidad', 3.40, 5.90, 90, true),
  ((select id from public.categories where slug='herramientas'),'Cerradura de pomo acero inoxidable', 'cerradura-pomo-inox',     'HER-310', 'Orso',      'Cerradura de pomo con llave para puertas interiores y de baño.', 'unidad', 6.80, 11.50, 48, false),
  ((select id from public.categories where slug='plomeria-sanitarios'),'Tanque de agua 1 100 L',       'tanque-agua-1100l',       'PLO-110', 'Plastigama','Tanque de polietileno con tapa, apto para agua potable.', 'unidad', 98.00, 129.00, 14, true),
  ((select id from public.categories where slug='plomeria-sanitarios'),'Inodoro one piece blanco',     'inodoro-one-piece',       'PLO-200', 'Edesa',     'Inodoro de una pieza, descarga doble, incluye asiento.', 'unidad', 78.00, 119.00, 9, false),
  ((select id from public.categories where slug='pinturas'),    'Pintura látex interior 1 galón',     'pintura-latex-galon',     'PIN-001', 'Cóndor',    'Pintura lavable para interiores, acabado mate. Colores a pedido.', 'galón', 12.30, 17.90, 70, false),
  ((select id from public.categories where slug='materiales-para-obra'),'Tubo PVC desagüe 110 mm x 3 m','tubo-pvc-110mm',          'MAT-110', 'Plastigama','Tubería sanitaria de PVC para desagües.', 'tubo', 8.90, 12.40, 150, false)
on conflict (slug) do nothing;

-- Promoción de ejemplo: 10 % en todo lo que tenga margen >= 30 %, sin bajar del 20 %
insert into public.promotions (name, badge, description, discount_type, discount_value, scope, min_margin_pct, keep_margin_pct, priority)
select 'Semana del constructor', '-10 %', 'Descuento en productos seleccionados', 'percent', 10, 'all', 30, 20, 1
where not exists (select 1 from public.promotions where name = 'Semana del constructor');

-- Imágenes de ejemplo para los productos de muestra (puedes reemplazarlas desde el panel).
-- Apuntan a las fotos que vienen dentro del proyecto web (/images/...).
insert into public.product_images (product_id, url, alt, is_primary)
select p.id, v.url, p.name, true
from (values
  ('plancha-teja-pvc-3m',      '/images/teja-pvc.jpg'),
  ('varilla-corrugada-12mm',   '/images/bodega-hierro.jpg'),
  ('malla-electrosoldada-6mm', '/images/camion-varillas.jpg'),
  ('cemento-portland-50kg',    '/images/bodega-frente.jpg'),
  ('breaker-1p-20a',           '/images/breaker.jpg'),
  ('cerradura-pomo-inox',      '/images/cerradura.jpg'),
  ('tanque-agua-1100l',        '/images/bodega-tanques.jpg'),
  ('inodoro-one-piece',        '/images/sanitarios.jpg'),
  ('pintura-latex-galon',      '/images/pasillo-pinturas.jpg'),
  ('tubo-pvc-110mm',           '/images/bodega-pvc.jpg')
) as v(slug, url)
join public.products p on p.slug = v.slug
where not exists (select 1 from public.product_images i where i.product_id = p.id);

-- ---------------------------------------------------------------------
-- Limpieza: borra los productos y la promoción de muestra (las categorías se quedan;
-- renómbralas o desactívalas desde el panel). Quita los guiones para ejecutar.
-- ---------------------------------------------------------------------
-- delete from public.products
-- where sku in ('CUB-001','HIE-012','HIE-020','CEM-050','ELE-120',
--               'HER-310','PLO-110','PLO-200','PIN-001','MAT-110');
-- delete from public.promotions where name = 'Semana del constructor';
