-- LDZ Studio: estrutura do banco (pode rodar várias vezes)
create extension if not exists pgcrypto;

create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id serial primary key,
  name text not null,
  slug text unique not null,
  description text not null default '',
  sort int not null default 0,
  active boolean not null default true
);

create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id serial primary key,
  name text not null,
  slug text unique not null,
  short_description text not null default '',
  description text not null default '',
  price_cents int not null default 0,
  compare_at_cents int,
  cost_cents int,
  stock int,                       -- null = sob encomenda / sem limite
  active boolean not null default true,
  featured boolean not null default false,
  category_id int references categories(id) on delete set null,
  images text[] not null default '{}',
  options jsonb not null default '[]'::jsonb, -- [{name, values:[{label, price_delta_cents}]}]
  production_days int not null default 3,
  weight_g int not null default 200,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on products(category_id);

create table if not exists coupons (
  code text primary key,
  type text not null check (type in ('percent','fixed','shipping')),
  value int not null default 0,     -- percent: 10 = 10%; fixed: centavos
  min_cents int not null default 0,
  max_uses int,
  uses int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create sequence if not exists order_number_seq start 1001;
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number int unique not null default nextval('order_number_seq'),
  access_token text not null default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pending',
  customer jsonb not null,
  address jsonb,
  items jsonb not null,
  subtotal_cents int not null,
  shipping_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null,
  shipping_method text,
  coupon_code text,
  payment_method text not null,
  payment_status text not null default 'pending',
  payment_id text,
  payment_url text,
  tracking_code text,
  notes text not null default '',
  admin_notes text not null default '',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on orders(created_at);
create index if not exists orders_status_idx on orders(status);

create table if not exists events (
  id bigserial primary key,
  type text not null,               -- view | product_view | add_to_cart | checkout | purchase
  path text,
  product_id int,
  session_id text,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists events_created_idx on events(created_at);
create index if not exists events_type_idx on events(type, created_at);
