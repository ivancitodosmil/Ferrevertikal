-- =====================================================================
--  FERRE VERTIKAL G&L  ·  Script único de configuración para Supabase
-- ---------------------------------------------------------------------
--  Cómo usarlo:
--   1. Abre tu proyecto en https://supabase.com/dashboard
--   2. SQL Editor  ->  New query  ->  pega TODO este archivo  ->  Run
--   3. Cambia el correo y la contraseña del superadmin en la sección 8
--      ANTES de ejecutar (o ejecútalo y luego cámbiala desde Authentication).
--
--  El script es idempotente: puedes volver a ejecutarlo sin romper nada.
--
--  Qué crea:
--   · Tablas: profiles, categories, products, product_images, promotions,
--             site_settings, orders (pedidos del carrito), messages (contacto)
--   · Roles de usuario (superadmin / admin / customer) con RLS
--   · Bucket de Storage "product-images" (público para lectura,
--     escritura solo para admins)
--   · Vistas públicas con el precio final ya calculado según promociones
--     y margen (el costo nunca se expone al público)
--   · Usuario superadmin inicial + datos de ejemplo
-- =====================================================================

create extension if not exists pgcrypto;
-- "http" permite verificar los pagos con PayPhone desde la base de datos (si no está disponible,
-- el pedido queda como "pago por verificar" y se revisa en PayPhone Business).
do $$ begin
  create extension if not exists http with schema extensions;
exception when others then raise notice 'Extensión http no disponible: la verificación automática de pagos quedará desactivada.'; end $$;

-- ---------------------------------------------------------------------
-- 1. Perfiles y roles
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('superadmin', 'admin', 'customer');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text unique,
  full_name   text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Un perfil por cada usuario que se registre
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿El usuario actual es admin o superadmin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('superadmin', 'admin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'superadmin'
  );
$$;

-- Cambiar el rol de un usuario por correo (solo superadmin, o desde el SQL editor)
create or replace function public.set_user_role(p_email text, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_superadmin() then
    raise exception 'Solo un superadmin puede cambiar roles';
  end if;
  update public.profiles set role = p_role, updated_at = now() where email = p_email;
  if not found then
    raise exception 'No existe un usuario con el correo %', p_email;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Utilidades
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create or replace function public.slugify(p text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
           lower(translate(p, 'áéíóúñÁÉÍÓÚÑüÜ', 'aeiounAEIOUNuU')),
           '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------------------------------------------------------------------
-- 3. Catálogo
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  icon        text,                      -- nombre de ícono que usa el front
  image_url   text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.categories (id) on delete set null,
  name         text not null,
  slug         text not null unique,
  sku          text unique,
  brand        text,
  description  text,
  unit         text not null default 'unidad',   -- unidad, saco, quintal, metro, galón...
  cost         numeric(12,2) not null default 0 check (cost >= 0),
  price        numeric(12,2) not null default 0 check (price >= 0),
  stock        int not null default 0,
  is_active    boolean not null default true,
  is_featured  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active, is_featured);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  path        text,            -- ruta dentro del bucket product-images
  url         text not null,   -- URL pública (del bucket o externa)
  alt         text,
  sort_order  int not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id);

-- Promociones.
--  scope: 'all' (todo el catálogo) | 'category' | 'product'
--  min_margin_pct: solo aplica a productos cuyo margen sea >= este valor.
--  keep_margin_pct: nunca dejar el margen por debajo de este valor
--                   (el descuento se recorta si hace falta).
create table if not exists public.promotions (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  badge           text,                      -- texto corto para la etiqueta, ej. "-15 %"
  description     text,
  discount_type   text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  discount_value  numeric(12,2) not null check (discount_value >= 0),
  scope           text not null default 'all' check (scope in ('all', 'category', 'product')),
  category_id     uuid references public.categories (id) on delete cascade,
  product_id      uuid references public.products (id) on delete cascade,
  min_margin_pct  numeric(5,2),
  keep_margin_pct numeric(5,2),
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz,
  is_active       boolean not null default true,
  priority        int not null default 0,     -- a mayor prioridad, gana ante empate
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Pedidos que llegan desde el carrito de la web (por WhatsApp o pagados con tarjeta)
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,                 -- FV-XXXXXX-XXXX (también es el clientTransactionId de PayPhone)
  customer_name  text not null,
  phone          text not null,
  email          text,
  delivery       text not null default 'retiro' check (delivery in ('retiro', 'entrega')),
  address        text,
  delivery_lat   numeric(9,6),                         -- punto de entrega marcado en el mapa
  delivery_lng   numeric(9,6),
  notes          text,
  items          jsonb not null default '[]'::jsonb,   -- [{id, name, sku, unit, qty, price}]
  subtotal       numeric(12,2) not null default 0,     -- base imponible
  tax            numeric(12,2) not null default 0,     -- IVA
  total          numeric(12,2) not null default 0,     -- total con IVA (lo que paga el cliente)
  channel        text not null default 'whatsapp' check (channel in ('whatsapp', 'tarjeta')),
  status         text not null default 'nuevo' check (status in ('nuevo', 'pendiente_pago', 'pagado', 'pago_por_verificar', 'pago_fallido', 'en_preparacion', 'entregado', 'cancelado')),
  payment        jsonb,                                -- respuesta de PayPhone (transactionId, authorizationCode, cardBrand, lastDigits…)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

-- Mensajes del formulario de contacto
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null,
  phone          text not null,
  email          text,
  message        text not null,
  status         text not null default 'nuevo' check (status in ('nuevo', 'atendido')),
  created_at     timestamptz not null default now()
);

-- Triggers updated_at y slugs automáticos
do $$ declare t text; begin
  foreach t in array array['profiles','categories','products','promotions','orders'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.ensure_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.name) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;
  return new;
end $$;
drop trigger if exists categories_slug on public.categories;
create trigger categories_slug before insert or update on public.categories for each row execute function public.ensure_slug();
drop trigger if exists products_slug on public.products;
create trigger products_slug before insert or update on public.products for each row execute function public.ensure_slug();

-- Solo una imagen principal por producto
create or replace function public.single_primary_image()
returns trigger language plpgsql as $$
begin
  if new.is_primary then
    update public.product_images set is_primary = false
    where product_id = new.product_id and id <> new.id and is_primary;
  end if;
  return new;
end $$;
drop trigger if exists product_images_primary on public.product_images;
create trigger product_images_primary after insert or update on public.product_images
  for each row execute function public.single_primary_image();

-- ---------------------------------------------------------------------
-- 4. Cálculo de precio final (promociones según margen)
-- ---------------------------------------------------------------------
-- margen % = (precio - costo) / precio * 100
create or replace function public.margin_pct(p_cost numeric, p_price numeric)
returns numeric language sql immutable as $$
  select case when p_price > 0 then round((p_price - p_cost) / p_price * 100, 2) else 0 end;
$$;

-- Devuelve la mejor promoción aplicable y el precio final de un producto.
create or replace function public.product_pricing(p_id uuid)
returns table (
  promotion_id   uuid,
  promotion_name text,
  badge          text,
  discount_type  text,
  discount_value numeric,
  final_price    numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_cost   numeric; v_price numeric; v_cat uuid; v_margin numeric;
  r        record;
  v_best   numeric := null; v_candidate numeric; v_floor numeric;
begin
  select cost, price, category_id into v_cost, v_price, v_cat from public.products where id = p_id;
  if v_price is null then return; end if;
  v_margin := public.margin_pct(v_cost, v_price);

  for r in
    select * from public.promotions pr
    where pr.is_active
      and pr.starts_at <= now()
      and (pr.ends_at is null or pr.ends_at >= now())
      and (pr.scope = 'all'
           or (pr.scope = 'category' and pr.category_id = v_cat)
           or (pr.scope = 'product'  and pr.product_id  = p_id))
      and (pr.min_margin_pct is null or v_margin >= pr.min_margin_pct)
    order by pr.priority desc, pr.created_at desc
  loop
    if r.discount_type = 'percent' then
      v_candidate := round(v_price * (1 - r.discount_value / 100), 2);
    else
      v_candidate := round(v_price - r.discount_value, 2);
    end if;
    -- proteger el margen mínimo configurado
    if r.keep_margin_pct is not null and v_cost > 0 then
      v_floor := round(v_cost / (1 - r.keep_margin_pct / 100), 2);
      if v_candidate < v_floor then v_candidate := v_floor; end if;
    end if;
    if v_candidate < 0 then v_candidate := 0; end if;
    if v_candidate < v_price and (v_best is null or v_candidate < v_best) then
      v_best := v_candidate;
      promotion_id := r.id; promotion_name := r.name; badge := r.badge;
      discount_type := r.discount_type; discount_value := r.discount_value;
    end if;
  end loop;

  final_price := coalesce(v_best, v_price);
  return next;
end $$;

-- Vista pública del catálogo (sin costo). Se consulta desde la web.
create or replace view public.catalog_public
with (security_invoker = false) as
select
  p.id, p.name, p.slug, p.sku, p.brand, p.description, p.unit, p.stock,
  p.is_featured, p.created_at,
  p.price,
  pr.final_price,
  pr.promotion_id, pr.promotion_name, pr.badge,
  pr.discount_type, pr.discount_value,
  case when pr.final_price < p.price
       then round((p.price - pr.final_price) / p.price * 100) else 0 end as discount_pct,
  c.id   as category_id,
  c.name as category_name,
  c.slug as category_slug,
  (select json_agg(json_build_object('id', i.id, 'url', i.url, 'alt', i.alt, 'is_primary', i.is_primary)
                   order by i.is_primary desc, i.sort_order)
     from public.product_images i where i.product_id = p.id) as images
from public.products p
left join public.categories c on c.id = p.category_id
cross join lateral public.product_pricing(p.id) pr
where p.is_active and (c.id is null or c.is_active);

-- Vista interna para administradores (incluye costo y margen)
create or replace view public.catalog_admin
with (security_invoker = true) as
select
  p.*,
  public.margin_pct(p.cost, p.price) as margin_pct,
  pr.final_price, pr.promotion_id, pr.promotion_name, pr.badge,
  public.margin_pct(p.cost, pr.final_price) as final_margin_pct,
  c.name as category_name,
  (select json_agg(json_build_object('id', i.id, 'url', i.url, 'path', i.path, 'alt', i.alt, 'is_primary', i.is_primary, 'sort_order', i.sort_order)
                   order by i.is_primary desc, i.sort_order)
     from public.product_images i where i.product_id = p.id) as images
from public.products p
left join public.categories c on c.id = p.category_id
cross join lateral public.product_pricing(p.id) pr;

-- Promociones vigentes (público)
create or replace view public.promotions_public
with (security_invoker = false) as
select id, name, badge, description, discount_type, discount_value, scope,
       category_id, product_id, starts_at, ends_at
from public.promotions
where is_active and starts_at <= now() and (ends_at is null or ends_at >= now());

grant select on public.catalog_public, public.promotions_public to anon, authenticated;
grant select on public.catalog_admin to authenticated;

-- ---------------------------------------------------------------------
-- 5. Seguridad (RLS)
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_images enable row level security;
alter table public.promotions     enable row level security;
alter table public.site_settings  enable row level security;
alter table public.orders         enable row level security;
alter table public.messages       enable row level security;

-- profiles
drop policy if exists "profiles: ver el propio o admin"  on public.profiles;
drop policy if exists "profiles: editar el propio"       on public.profiles;
drop policy if exists "profiles: superadmin gestiona"    on public.profiles;
create policy "profiles: ver el propio o admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: editar el propio" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles: superadmin gestiona" on public.profiles
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- categories: lectura pública, escritura admin
drop policy if exists "categories: lectura publica" on public.categories;
drop policy if exists "categories: admin escribe"   on public.categories;
create policy "categories: lectura publica" on public.categories for select using (is_active or public.is_admin());
create policy "categories: admin escribe"   on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- products / images / promotions: el público usa las vistas; las tablas solo admin
drop policy if exists "products: admin" on public.products;
create policy "products: admin" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "product_images: lectura publica" on public.product_images;
drop policy if exists "product_images: admin"           on public.product_images;
create policy "product_images: lectura publica" on public.product_images for select using (true);
create policy "product_images: admin" on public.product_images for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "promotions: admin" on public.promotions;
create policy "promotions: admin" on public.promotions for all using (public.is_admin()) with check (public.is_admin());

-- site_settings: lectura pública, escritura admin
drop policy if exists "settings: lectura publica" on public.site_settings;
drop policy if exists "settings: admin escribe"   on public.site_settings;
create policy "settings: lectura publica" on public.site_settings for select using (true);
create policy "settings: admin escribe"   on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- orders: cualquiera puede crear un pedido; solo admin los lee y gestiona.
-- El público consulta su pedido por código mediante get_order_public (no por select directo).
drop policy if exists "orders: publico crea"   on public.orders;
drop policy if exists "orders: admin gestiona" on public.orders;
create policy "orders: publico crea"   on public.orders for insert with check (true);
create policy "orders: admin gestiona" on public.orders for all using (public.is_admin()) with check (public.is_admin());

-- messages: cualquiera puede escribir, solo admin lee
drop policy if exists "messages: publico envia" on public.messages;
drop policy if exists "messages: admin gestiona" on public.messages;
create policy "messages: publico envia"  on public.messages for insert with check (true);
create policy "messages: admin gestiona" on public.messages for all using (public.is_admin()) with check (public.is_admin());

-- Datos públicos de un pedido (para la pantalla de pago y la confirmación), solo por su código
create or replace function public.get_order_public(p_code text)
returns table (code text, customer_name text, phone text, email text, delivery text, address text, delivery_lat numeric, delivery_lng numeric, items jsonb,
               subtotal numeric, tax numeric, total numeric, channel text, status text, payment jsonb, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select o.code, o.customer_name, o.phone, o.email, o.delivery, o.address, o.delivery_lat, o.delivery_lng, o.items, o.subtotal, o.tax, o.total, o.channel, o.status,
         case when o.payment is null then null else jsonb_build_object(
           'transaction_id', o.payment->>'transaction_id', 'authorization_code', o.payment->>'authorization_code',
           'card_brand', o.payment->>'card_brand', 'last_digits', o.payment->>'last_digits', 'confirmed_at', o.payment->>'confirmed_at') end,
         o.created_at
  from public.orders o where o.code = p_code
$$;
grant execute on function public.get_order_public(text) to anon, authenticated;

-- Confirmación del pago con PayPhone. La hace la base de datos (no el navegador) con el token del
-- comercio guardado en site_settings → payments, así el cliente no puede marcar un pedido como pagado.
create or replace function public.confirm_order_payment(p_code text, p_payphone_id bigint)
returns setof public.orders
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_order   public.orders%rowtype;
  v_cfg     jsonb;
  v_resp    record;
  v_json    jsonb;
  v_status  text;
  v_amount  bigint;
  v_cents   bigint;
begin
  select * into v_order from public.orders where code = p_code for update;
  if not found then raise exception 'Pedido % no existe', p_code; end if;
  if v_order.status in ('pagado', 'en_preparacion', 'entregado') then
    return query select * from public.orders where id = v_order.id; return;
  end if;

  select value into v_cfg from public.site_settings where key = 'payments';
  v_cents := round(v_order.total * 100);

  begin
    select * into v_resp from extensions.http((
      'POST',
      coalesce(v_cfg->>'confirm_url', 'https://pay.payphonetodoesposible.com/api/button/V2/Confirm'),
      array[extensions.http_header('Authorization', 'Bearer ' || coalesce(v_cfg->>'token', ''))],
      'application/json',
      jsonb_build_object('id', p_payphone_id, 'clientTxId', p_code)::text
    )::extensions.http_request);
    v_json := v_resp.content::jsonb;
  exception when others then
    -- Sin extensión http o sin red: queda para revisión manual en PayPhone Business
    update public.orders set status = 'pago_por_verificar',
      payment = jsonb_build_object('provider', 'payphone', 'transaction_id', p_payphone_id, 'verified', false, 'error', sqlerrm, 'reported_at', now())
      where id = v_order.id;
    return query select * from public.orders where id = v_order.id; return;
  end;

  v_status := coalesce(v_json->>'transactionStatus', '');
  v_amount := coalesce((v_json->>'amount')::bigint, 0);

  if v_status = 'Approved' and v_amount = v_cents then
    update public.orders set status = 'pagado', payment = jsonb_build_object(
      'provider', 'payphone', 'verified', true, 'transaction_id', coalesce(v_json->>'transactionId', p_payphone_id::text),
      'authorization_code', v_json->>'authorizationCode', 'card_brand', v_json->>'cardBrand', 'last_digits', v_json->>'lastDigits',
      'amount_cents', v_amount, 'confirmed_at', now(), 'raw', v_json) where id = v_order.id;
  elsif v_status = 'Approved' then
    update public.orders set status = 'pago_por_verificar', payment = jsonb_build_object(
      'provider', 'payphone', 'verified', false, 'transaction_id', p_payphone_id, 'reason', 'El monto pagado no coincide con el pedido',
      'amount_cents', v_amount, 'expected_cents', v_cents, 'raw', v_json, 'reported_at', now()) where id = v_order.id;
  else
    update public.orders set status = 'pago_fallido', payment = jsonb_build_object(
      'provider', 'payphone', 'verified', true, 'transaction_id', p_payphone_id, 'status', v_status,
      'message', coalesce(v_json->>'message', v_json->>'messageCode'), 'raw', v_json, 'reported_at', now()) where id = v_order.id;
  end if;

  return query select * from public.orders where id = v_order.id;
end $$;
grant execute on function public.confirm_order_payment(text, bigint) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Storage: imágenes de productos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product-images: lectura publica" on storage.objects;
drop policy if exists "product-images: admin sube"      on storage.objects;
drop policy if exists "product-images: admin edita"     on storage.objects;
drop policy if exists "product-images: admin borra"     on storage.objects;
create policy "product-images: lectura publica" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product-images: admin sube" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin edita" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
create policy "product-images: admin borra" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Configuración del sitio
-- ---------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('contact', jsonb_build_object(
      'whatsapp', '593997069684',
      'whatsapp_name', 'Mónica',
      'phone', '+593 99 706 9684',
      'email', 'ventas@ferrevertikal.com',
      'address', 'Av. 8 de Diciembre, junto a la Clínica Nataly, Loja',
      'hours', 'Lunes a sábado 7:30 – 18:00',
      'instagram', '@ferrevertikal',
      'maps_url', 'https://www.google.com/maps/search/?api=1&query=Ferromarket+Le%C3%B3n+Av.+8+de+Diciembre+Loja',
      'lat', -3.96285,
      'lng', -79.21454
  )),
  ('home', jsonb_build_object(
      'tagline', 'Tu proyecto, nuestro compromiso',
      'headline', 'Todo para tu obra, en un solo lugar.',
      'delivery_note', 'Entregamos en obra con nuestros camiones.'
  )),
  -- Pago con tarjeta (PayPhone). Se activa desde el panel → Configuración → Pagos con el token y StoreId
  -- de la aplicación WEB creada en https://developer.payphonetodoesposible.com
  ('payments', jsonb_build_object(
      'enabled', false,
      'provider', 'payphone',
      'token', '',
      'store_id', '',
      'iva_pct', 15,
      'min_delivery', 50          -- monto mínimo (USD) para pagar en línea con entrega a domicilio
  ))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 8. SUPERADMIN INICIAL   <<< CAMBIA EL CORREO Y LA CONTRASEÑA >>>
-- ---------------------------------------------------------------------
do $$
declare
  v_email    text := 'admin@ferrevertikal.com';   -- <<< cambia esto
  v_password text := 'CambiaEstaClave123!';       -- <<< y esto
  v_id       uuid;
begin
  select id into v_id from auth.users where email = v_email;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Super Admin"}'::jsonb, now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;
  insert into public.profiles (id, email, full_name, role)
  values (v_id, v_email, 'Super Admin', 'superadmin')
  on conflict (id) do update set role = 'superadmin', email = excluded.email;
end $$;

-- Para dar permisos de admin a otra cuenta que ya se registró:
--   select public.set_user_role('otro@correo.com', 'admin');

-- ---------------------------------------------------------------------
-- 9. Datos de ejemplo (puedes borrarlos desde el panel)
-- ---------------------------------------------------------------------
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

-- Listo. Verifica con:
--   select * from public.catalog_public;
--   select email, role from public.profiles;
