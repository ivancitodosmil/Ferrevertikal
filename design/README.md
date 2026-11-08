# Variantes de diseño

Para volver a la versión con tipografía condensada (Big Shoulders Display):
  cp design/global.condensada.css src/styles/global.css && cp design/index.condensada.html index.html

Para la versión Open Sans (labels en mayúsculas, enlaces con flecha):
  cp design/global.opensans.css src/styles/global.css && cp design/index.opensans.html index.html

## Variante C (activa desde 2026-11-07): identidad de ferretería
`global.v4-ferreteria.css` + `index.v4-ferreteria.html`. Big Shoulders Display + Archivo,
pizarra de precios en el hero, tarjetas tipo etiqueta de góndola, etiqueta colgante de promo,
listas ralladas (.datos). Sin etiquetas en mayúsculas ni flechas. Hecha tras el comentario
del cliente de que B se veía "genérica", siguiendo la skill oficial frontend-design.

## Variante D "tienda" (activa desde 2026-11-08)
`global.tienda.css` + `index.tienda.html`. Estructura original + Open Sans estilo CTUCL,
pulida con las guías de Impeccable (sin eyebrows sobre títulos, sin marquesina, sin icon-tiles,
sin bordes laterales de color, texto tintado sobre fondos oscuros). Componentes de tienda:
buscador en header, chips de categorías, tarjetas con "Agregar a cotización", catálogo con
orden/filtro/conteos, caja de compra en producto, cotización con steppers, recorrido scroll
(Tour) inspirado en scroll-world. Skills descargadas (solo lectura, instalación bloqueada):
scratchpad/skills-dl/{impeccable,scroll-world}.
