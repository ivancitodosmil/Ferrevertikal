# Ferre Vertikal G&L — sitio web + panel de administración

Tienda/catálogo para ferretería hecho con **React + Vite**, animaciones con **GSAP** y backend en **Supabase**
(base de datos, autenticación, storage de imágenes y reglas de seguridad).

## Estructura

```
ferrevertikal/
├── supabase/
│   ├── setup.sql           ← base de datos: pégalo en el SQL Editor (se puede volver a ejecutar)
│   └── datos-ejemplo.sql   ← opcional: categorías, productos y promoción de muestra
├── public/images/          ← logo y fotos de la ferretería
├── src/
│   ├── pages/              ← Inicio, Catálogo, Producto, Promociones, Contacto, Cotización
│   ├── admin/              ← Panel: login, resumen, productos (con fotos), categorías,
│   │                          promociones por margen, cotizaciones, configuración y roles
│   ├── services/           ← catalog.js (público) · admin.js (panel) · auth.js
│   ├── lib/supabase.js     ← cliente de Supabase (si no hay .env → modo demo)
│   ├── lib/pricing.js      ← cálculo de precio final / margen (igual que en SQL)
│   ├── hooks/useGsap.js    ← efectos: hero, reveal al hacer scroll, parallax, contadores
│   └── styles/global.css   ← sistema visual (colores, tipografía, componentes)
└── .env.example
```

## 1. Supabase (5 minutos)

1. Crea un proyecto en https://supabase.com/dashboard
2. Abre **SQL Editor → New query**, pega el contenido de `supabase/setup.sql`.
3. En la **sección 8** del script cambia el correo y la contraseña del superadmin.
4. **Run**. Esto crea tablas, roles, políticas RLS, el bucket `product-images`
   y el usuario superadmin. Opcional: ejecuta también `supabase/datos-ejemplo.sql`
   para ver el sitio con productos de muestra.
5. Ve a **Project Settings → API** y copia la URL y la `anon key`.

> **Actualizar la base de datos** cuando el proyecto cambie (por ejemplo, los descuentos por volumen):
> vuelve a pegar y ejecutar `supabase/setup.sql` completo. Es idempotente: no toca tus productos ni tu configuración.

## 2. Ejecutar la web

```bash
cp .env.example .env      # pega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev               # http://localhost:5173
```

Sin `.env` la web arranca en **modo demostración** con datos locales
(panel: cualquier correo + contraseña `demo`).

## 3. Panel de administración

`http://localhost:5173/admin` → inicia sesión con el superadmin creado en el script.

- **Productos**: costo, precio, stock, categoría, fotos (arrastrar y soltar → bucket de Supabase).
  El margen se calcula solo. El costo nunca se expone al público.
- **Promociones**: % o monto fijo; a todo el catálogo, una categoría o un producto.
  - *Margen mínimo*: solo entran los productos con ese margen o más.
  - *Margen a proteger*: el descuento se recorta para no bajar de ese margen.
  - *Cantidad mínima* (descuento por volumen): el precio rebajado solo aplica cuando el cliente lleva esa
    cantidad o más del mismo producto. El catálogo muestra "Desde N: $X c/u", el carrito lo aplica solo al
    llegar a la cantidad y el pedido / mensaje de WhatsApp registran el precio cobrado.
  - Debajo del valor del descuento se ve en vivo cuánto se rebaja por unidad y a qué precio y margen quedaría.
  - Vista previa en vivo de qué productos entran y a qué precio quedan.
- **Cotizaciones**: lo que los clientes envían desde la web (y botón para responder por WhatsApp).
- **Configuración**: WhatsApp, teléfono, dirección, horario, textos del inicio y roles de usuarios.

Para dar permisos a otra persona: que se registre (o créala en Authentication) y luego en
**Configuración → Usuarios** asígnale el rol `admin`, o en SQL:
`select public.set_user_role('correo@ejemplo.com', 'admin');`

## 4. Carrito, pedidos y pago con tarjeta

- El cliente arma su **carrito** (`/carrito`) y elige cómo pedir:
  - **Pedir todo esto por WhatsApp** (un solo toque, sin formulario): se guarda el pedido (tabla `orders`,
    canal `whatsapp`) y se abre WhatsApp con el detalle completo (productos, cantidades, subtotal, IVA, total).
    El nombre de quien atiende ("Mónica") se cambia en Configuración → Datos de contacto.
  - El punto de entrega se guarda como `delivery_lat/lng` y el panel muestra un enlace a Google Maps para el chofer.
  - **Pagar al recibir** (contraentrega): deja nombre, teléfono y cómo lo recibe (entrega en obra con punto en el
    mapa, o retiro en bodega). El pedido queda como `nuevo` con canal `contraentrega` y la tienda lo llama para
    confirmar. Se puede apagar en Panel → Configuración → Pagos.
  - **Pagar en línea y recibirlo en casa**: solo entrega a domicilio. El cliente marca el punto en el mapa
    (obligatorio), se guarda el pedido como `pendiente_pago` y se abre `/pago/<código>` con la
    *Cajita de Pagos* de PayPhone (Visa, Mastercard, Diners, saldo PayPhone). Hay un **pedido mínimo**
    configurable en Panel → Configuración (`payments.min_delivery`, 50 USD por defecto, 0 = sin mínimo);
    por debajo solo se ofrece WhatsApp.
- Los pedidos y los mensajes del formulario de contacto se gestionan en **Panel → Pedidos**
  (estados: nuevo, pendiente de pago, pagado, pago por verificar, en preparación, entregado, cancelado).
- Sin credenciales de PayPhone el botón "Pagar con tarjeta" no se muestra (en modo demo aparece una simulación).

### Activar PayPhone (una sola vez)
1. Abre una cuenta de comercio en https://payphone.app (Payphone Business) y crea un usuario con rol *Desarrollador*.
2. En https://developer.payphonetodoesposible.com crea una aplicación de tipo **WEB** con:
   - *Dominio web*: el dominio del sitio (p. ej. `https://ferrevertikal.com`). Localmente sirve `http://localhost`.
   - *URL de respuesta*: `https://TU-DOMINIO/pago/respuesta`
3. Copia el **Token** y el **StoreId** en **Panel → Configuración → Pagos con tarjeta** y marca "Mostrar el botón".
4. La confirmación del pago la hace la base de datos (función `confirm_order_payment`) llamando a PayPhone con
   el token, así nadie puede marcar un pedido como pagado desde el navegador. Requiere la extensión `http`
   de Supabase (el script la activa; si no estuviera disponible, el pedido queda como **"pago por verificar"**
   y se revisa en PayPhone Business antes de despachar).
5. Los precios del catálogo son finales. El **IVA a desglosar** se configura en Panel → Configuración → Pagos:
   con **0** (lo normal si no emites factura) el carrito, el pago y los mensajes muestran solo el total;
   con 15 se desglosa subtotal + IVA en el cobro y en el mensaje de WhatsApp.

## 5. Fotos del sitio

- Las fotos públicas están en `public/images/`. Las originales recibidas (comprimidas por WhatsApp, 960×1280)
  se guardan en `design/images-originales/`; las de `public/images/` tienen limpieza + nitidez y las de portada
  (`bodega-frente`, `camion-carga`, `bodega-hierro`) están al doble de resolución.
- Para reemplazar una foto por una de mejor calidad basta con sobrescribir el archivo con el mismo nombre.
  Pide las fotos como **Archivo/Documento** (no como foto) en WhatsApp/Telegram para que no se compriman.
- En el inicio, clic en una foto del mosaico (o en la imagen de un producto) la amplía a pantalla completa.

## 6. Publicar

```bash
npm run build             # genera dist/
```

El proyecto ya incluye las reglas de "rewrite" para que las rutas del sitio (`/catalogo`, `/admin`, etc.)
funcionen al recargar la página: `vercel.json` (Vercel) y `netlify.toml` + `public/_redirects` (Netlify).

### Vercel (recomendado)
1. Sube la carpeta del proyecto a GitHub (sin `node_modules/`, `dist/` ni `.env`).
2. En vercel.com → *Add New Project* → importa el repositorio. Framework: **Vite** (lo detecta solo).
3. En *Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos valores del `.env`).
   Si conectas la integración oficial de Supabase en Vercel, sus variables `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` también sirven: la web las lee si no están las `VITE_`.
4. *Deploy*. Cada `git push` vuelve a publicar.

Sin GitHub: `npx vercel --prod` desde la carpeta del proyecto (pide iniciar sesión la primera vez).

### Netlify
*Add new site → Import from Git* (build `npm run build`, publish `dist`), o arrastra la carpeta `dist/`
en app.netlify.com/drop. Configura las mismas dos variables de entorno en *Site settings → Environment*.

### Después de publicar
- En Supabase → *Authentication → URL Configuration* pon la URL pública del sitio en *Site URL*
  y en *Redirect URLs* (por ejemplo `https://ferrevertikal.vercel.app/**`) para que el login del panel funcione.
- Dominio propio: en Vercel/Netlify → *Domains* → agrega `ferrevertikal.com` y apunta el DNS como indiquen.
