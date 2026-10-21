import { q, one } from "./db";

export type OptionValue = { label: string; price_delta_cents: number };
export type ProductOption = { name: string; values: OptionValue[] };
export type Product = {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price_cents: number;
  compare_at_cents: number | null;
  cost_cents: number | null;
  stock: number | null;
  active: boolean;
  featured: boolean;
  category_id: number | null;
  category_name?: string | null;
  category_slug?: string | null;
  images: string[];
  options: ProductOption[];
  production_days: number;
  weight_g: number;
  sort: number;
  created_at: string;
};
export type Category = { id: number; name: string; slug: string; description: string; sort: number; active: boolean; count?: number };

const SELECT = `select p.*, c.name as category_name, c.slug as category_slug
  from products p left join categories c on c.id = p.category_id`;

export async function listProducts(opts: { category?: string; search?: string; sort?: string; featured?: boolean; limit?: number } = {}) {
  const where = ["p.active"];
  const params: unknown[] = [];
  if (opts.category) {
    params.push(opts.category);
    where.push(`c.slug = $${params.length}`);
  }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    where.push(`(p.name ilike $${params.length} or p.short_description ilike $${params.length})`);
  }
  if (opts.featured) where.push("p.featured");
  const order =
    opts.sort === "menor-preco" ? "p.price_cents asc" :
    opts.sort === "maior-preco" ? "p.price_cents desc" :
    opts.sort === "novidades" ? "p.created_at desc" :
    "p.featured desc, p.sort asc, p.created_at desc";
  const limit = opts.limit ? ` limit ${Number(opts.limit)}` : "";
  return q<Product>(`${SELECT} where ${where.join(" and ")} order by ${order}${limit}`, params);
}

export async function getProductBySlug(slug: string) {
  return one<Product>(`${SELECT} where p.slug = $1 and p.active`, [slug]);
}

export async function listCategories(onlyActive = true) {
  return q<Category>(
    `select c.*, (select count(*)::int from products p where p.category_id=c.id and p.active) as count
     from categories c ${onlyActive ? "where c.active" : ""} order by c.sort, c.name`,
  );
}

/** Preço unitário de um produto com as opções escolhidas (validado no servidor). */
export function unitPrice(p: Product, selected: Record<string, string>) {
  let price = p.price_cents;
  for (const opt of p.options ?? []) {
    const chosen = selected?.[opt.name];
    const v = opt.values.find((x) => x.label === chosen);
    if (v) price += v.price_delta_cents || 0;
  }
  return price;
}
