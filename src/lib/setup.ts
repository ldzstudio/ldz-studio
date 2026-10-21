import "server-only";
import bcrypt from "bcryptjs";
import type { Pool } from "pg";

// Estrutura do banco. Roda sozinha no primeiro acesso (idempotente).
const SCHEMA = `
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
`;

const cores = { name: "Cor", values: ["Preto", "Branco", "Cinza", "Vermelho"].map((label) => ({ label, price_delta_cents: 0 })) };
const CATEGORIES: [string, string, string, number][] = [
  ["Action Figures", "action-figures", "Personagens e colecionáveis pintados à mão.", 1],
  ["Decoração", "decoracao", "Peças para deixar seu espaço com a sua cara.", 2],
  ["Utilidades", "utilidades", "Suportes, organizadores e soluções do dia a dia.", 3],
  ["Sob Medida", "sob-medida", "Projetos personalizados do seu jeito.", 4],
];
const PRODUCTS: [string, string, string, number, number | null, string, boolean, unknown[]][] = [
  ["Pantera LDZ Geométrica", "pantera-ldz-geometrica", "A mascote da casa em versão escultura low-poly.", 8990, 10990, "decoracao", true, [cores, { name: "Tamanho", values: [{ label: "15 cm", price_delta_cents: 0 }, { label: "25 cm", price_delta_cents: 4000 }] }]],
  ["Suporte de Headset Wave", "suporte-headset-wave", "Suporte firme e estiloso para seu headset gamer.", 5990, null, "utilidades", true, [cores]],
  ["Vaso Facetado Low Poly", "vaso-facetado-low-poly", "Vaso geométrico ideal para suculentas.", 3990, 4990, "decoracao", true, [cores]],
  ["Action Figure Personalizada", "action-figure-personalizada", "Seu personagem favorito impresso em alta resolução e pintado à mão.", 19990, null, "action-figures", true, []],
  ["Organizador de Mesa Modular", "organizador-mesa-modular", "Módulos encaixáveis para canetas, cabos e acessórios.", 4590, null, "utilidades", false, [cores]],
  ["Chaveiro Personalizado", "chaveiro-personalizado", "Chaveiro com nome ou logo da sua marca.", 1990, null, "sob-medida", false, [cores]],
];

export async function setupDatabase(pool: Pool) {
  const c = await pool.connect();
  try {
    await c.query("select pg_advisory_lock(424242)");
    await c.query(SCHEMA);
    await c.query("insert into settings(key, value) values ('site', '{}') on conflict do nothing");

    // Primeiro acesso ao painel: cria o admin das variáveis ADMIN_EMAIL / ADMIN_PASSWORD
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "";
    const admins = await c.query("select 1 from admin_users limit 1");
    if (!admins.rowCount && email && password) {
      await c.query("insert into admin_users(email, password_hash) values ($1,$2) on conflict do nothing", [email, await bcrypt.hash(password, 10)]);
    }

    // Loja nova: produtos de exemplo (desligue com SEED=0)
    const seeded = await c.query("select 1 from settings where key='seeded'");
    if (!seeded.rowCount) {
      const products = await c.query("select 1 from products limit 1");
      if (!products.rowCount && process.env.SEED !== "0") {
        const ids: Record<string, number> = {};
        for (const [name, slug, description, sort] of CATEGORIES) {
          const r = await c.query("insert into categories(name, slug, description, sort) values ($1,$2,$3,$4) on conflict (slug) do update set name=excluded.name returning id", [name, slug, description, sort]);
          ids[slug] = r.rows[0].id;
        }
        let sort = 0;
        for (const [name, slug, short, price, compare, cat, featured, options] of PRODUCTS) {
          await c.query(
            `insert into products(name, slug, short_description, description, price_cents, compare_at_cents, category_id, featured, options, sort)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (slug) do nothing`,
            [name, slug, short, `${short}\n\nImpresso em PLA de alta qualidade, com acabamento revisado peça por peça. Produzido sob encomenda pela LDZ Studio.`, price, compare, ids[cat], featured, JSON.stringify(options), sort++],
          );
        }
        await c.query("insert into coupons(code, type, value) values ('BEMVINDO10','percent',10) on conflict do nothing");
      }
      await c.query("insert into settings(key, value) values ('seeded', 'true') on conflict do nothing");
    }
  } finally {
    await c.query("select pg_advisory_unlock(424242)").catch(() => {});
    c.release();
  }
}
