// Cria as tabelas, o usuário admin e (se a loja estiver vazia) produtos de exemplo.
// Uso: npm run db:setup
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";
import bcrypt from "bcryptjs";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL no .env");
  process.exit(1);
}
const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
});
await client.connect();

await client.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
console.log("✓ Tabelas prontas");

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
if (email && password) {
  const { rowCount } = await client.query("select 1 from admin_users where email=$1", [email]);
  if (!rowCount) {
    await client.query("insert into admin_users(email, password_hash) values ($1,$2)", [
      email,
      await bcrypt.hash(password, 10),
    ]);
    console.log(`✓ Admin criado: ${email}`);
  } else {
    console.log(`• Admin ${email} já existe (senha não alterada)`);
  }
}

await client.query("insert into settings(key, value) values ('site', '{}') on conflict do nothing");

const { rows } = await client.query("select count(*)::int as n from products");
if (rows[0].n === 0 && process.env.SEED !== "0") {
  const cats = [
    ["Action Figures", "action-figures", "Personagens e colecionáveis pintados à mão.", 1],
    ["Decoração", "decoracao", "Peças para deixar seu espaço com a sua cara.", 2],
    ["Utilidades", "utilidades", "Suportes, organizadores e soluções do dia a dia.", 3],
    ["Sob Medida", "sob-medida", "Projetos personalizados do seu jeito.", 4],
  ];
  const ids = {};
  for (const [name, slug, description, sort] of cats) {
    const r = await client.query(
      "insert into categories(name, slug, description, sort) values ($1,$2,$3,$4) on conflict (slug) do update set name=excluded.name returning id",
      [name, slug, description, sort],
    );
    ids[slug] = r.rows[0].id;
  }
  const cores = { name: "Cor", values: ["Preto", "Branco", "Cinza", "Vermelho"].map((label) => ({ label, price_delta_cents: 0 })) };
  const products = [
    ["Pantera LDZ Geométrica", "pantera-ldz-geometrica", "A mascote da casa em versão escultura low-poly.", 8990, 10990, "decoracao", true, [cores, { name: "Tamanho", values: [{ label: "15 cm", price_delta_cents: 0 }, { label: "25 cm", price_delta_cents: 4000 }] }]],
    ["Suporte de Headset Wave", "suporte-headset-wave", "Suporte firme e estiloso para seu headset gamer.", 5990, null, "utilidades", true, [cores]],
    ["Vaso Facetado Low Poly", "vaso-facetado-low-poly", "Vaso geométrico ideal para suculentas.", 3990, 4990, "decoracao", true, [cores]],
    ["Action Figure Personalizada", "action-figure-personalizada", "Seu personagem favorito impresso em alta resolução e pintado à mão.", 19990, null, "action-figures", true, []],
    ["Organizador de Mesa Modular", "organizador-mesa-modular", "Módulos encaixáveis para canetas, cabos e acessórios.", 4590, null, "utilidades", false, [cores]],
    ["Chaveiro Personalizado", "chaveiro-personalizado", "Chaveiro com nome ou logo da sua marca.", 1990, null, "sob-medida", false, [cores]],
  ];
  let sort = 0;
  for (const [name, slug, short, price, compare, cat, featured, options] of products) {
    await client.query(
      `insert into products(name, slug, short_description, description, price_cents, compare_at_cents, category_id, featured, options, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (slug) do nothing`,
      [name, slug, short, `${short}\n\nImpresso em PLA de alta qualidade, com acabamento revisado peça por peça. Produzido sob encomenda pela LDZ Studio.`, price, compare, ids[cat], featured, JSON.stringify(options), sort++],
    );
  }
  await client.query("insert into coupons(code, type, value) values ('BEMVINDO10','percent',10) on conflict do nothing");
  console.log("✓ Produtos de exemplo e cupom BEMVINDO10 criados (apague/edite no painel)");
}

await client.end();
console.log("Pronto!");
