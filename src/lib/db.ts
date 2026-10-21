import { Pool, type QueryResultRow } from "pg";

const g = globalThis as unknown as { __pgPool?: Pool };

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  return new Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

export function pool() {
  if (!g.__pgPool) g.__pgPool = makePool();
  return g.__pgPool;
}

export async function q<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  const r = await pool().query<T>(text, params);
  return r.rows;
}

export async function one<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
