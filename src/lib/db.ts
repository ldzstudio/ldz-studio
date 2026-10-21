import { Pool, type QueryResultRow } from "pg";
import { setupDatabase } from "./setup";

const g = globalThis as unknown as { __pgPool?: Pool; __pgReady?: Promise<void> };

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  return new Pool({
    connectionString: url,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

/** Pool pronto para uso: na primeira chamada cria as tabelas e o admin, se faltarem. */
export async function db() {
  if (!g.__pgPool) g.__pgPool = makePool();
  if (!g.__pgReady) {
    g.__pgReady = setupDatabase(g.__pgPool).catch((e) => {
      g.__pgReady = undefined;
      throw e;
    });
  }
  await g.__pgReady;
  return g.__pgPool;
}

export async function q<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  const r = await (await db()).query<T>(text, params);
  return r.rows;
}

export async function one<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
