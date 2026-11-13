-- EXIST perfume bar: products, orders, payments, admin. Unowned store rows (auth off).

create table if not exists stores (
  id text primary key,
  brand_name text not null default 'EXIST',
  logo_url text,
  primary_color text not null default '#C7A46A',
  background text not null default '#0E0E0E',
  bot_username text not null default 'exist_bar',
  currency text not null default 'KZT',
  payment_provider text not null default 'mock',
  catalog_kind text not null default 'perfume',
  pickup_city text not null default 'Алматы',
  pickup_address text not null default 'ул. Панфилова, 98',
  delivery_text text not null default 'Доставка по Алматы — 1 500 ₸, по Астане — 2 000 ₸. Самовывоз бесплатно.',
  delivery_almaty_kzt integer not null default 1500,
  delivery_astana_kzt integer not null default 2000,
  delivery_other_kzt integer not null default 2500,
  seller_phone text not null default '+7 700 000 00 00',
  seller_telegram text not null default 'exist_bar',
  accepting_orders boolean not null default true,
  kaspi_api_key text,
  kaspi_webhook_secret text,
  kaspi_cashier_phone text,
  kaspi_base_url text,
  telegram_bot_token text,
  telegram_webhook_secret text,
  seller_telegram_chat_id text,
  admin_telegram_ids text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  name text not null,
  sku text,
  brand text,
  price_kzt integer not null,
  old_price_kzt integer,
  description text,
  availability text not null default 'in_stock',
  visible boolean not null default true,
  sort_order integer not null default 0,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_store_visible_idx on products (store_id, visible, sort_order);

create table if not exists product_images (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  sort_order integer not null default 0,
  mime text not null default 'image/jpeg',
  url text,
  data_base64 text,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on product_images (product_id, sort_order);

create table if not exists orders (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  order_number integer not null unique,
  customer_name text not null,
  customer_phone text not null,
  city text not null,
  fulfillment text not null,
  address text,
  comment text,
  payment_method text not null,
  status text not null default 'pending_payment',
  subtotal_kzt integer not null,
  delivery_kzt integer not null default 0,
  total_kzt integer not null,
  buyer_telegram_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_store_created_idx on orders (store_id, created_at desc);

create table if not exists order_items (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text,
  name_snapshot text not null,
  brand_snapshot text,
  volume_snapshot text,
  price_kzt integer not null,
  qty integer not null,
  image_url text
);
create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists payments (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  provider text not null,
  provider_invoice_id text,
  amount_kzt integer not null,
  phone text,
  description text,
  status text not null default 'pending',
  payment_url text,
  qr_payload text,
  raw_payload jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on payments (order_id, created_at desc);
create index if not exists payments_invoice_idx on payments (provider_invoice_id);

create table if not exists admin_users (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  login text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  token text primary key,
  admin_id text not null references admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists restock_requests (
  id text primary key,
  store_id text not null references stores(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists bot_sessions (
  chat_id text primary key,
  step text not null default 'idle',
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists notification_log (
  id text primary key,
  store_id text not null,
  kind text not null,
  title text not null,
  body text not null,
  order_id text,
  created_at timestamptz not null default now()
);

create sequence if not exists order_number_seq start with 1042;
