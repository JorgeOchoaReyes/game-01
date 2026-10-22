import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { MIGRATIONS } from "./migrations";

// Postgres when DATABASE_URL is set (production); otherwise an embedded PGlite
// database on disk, so `pnpm dev` needs no setup. POLLY_PGLITE_DIR picks the
// folder, and "memory://" keeps it in memory (tests).
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Next bundles pages and route handlers separately, so a module-level variable
// would exist once per bundle. Keep one connection per process on globalThis:
// two PGlite instances on one folder do not see each other's writes.
const shared = globalThis as unknown as { __pollyDb?: Promise<Db> | null };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    return drizzle(postgres(url, { max: 5 }), { schema }) as unknown as Db;
  }
  if (process.env.VERCEL) {
    // a serverless filesystem is wiped between invocations: never silently lose games
    throw new Error("DATABASE_URL is not set. Polly needs Postgres in production.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = process.env.POLLY_PGLITE_DIR || ".data/pglite";
  return drizzle(new PGlite(dir), { schema }) as unknown as Db;
}

async function migrate(db: Db): Promise<void> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS polly_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const rows = (await db.execute(sql`SELECT id FROM polly_migrations`)) as unknown as { rows?: { id: string }[] } | { id: string }[];
  const list = Array.isArray(rows) ? rows : rows.rows ?? [];
  const applied = new Set(list.map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    await db.transaction(async (tx) => {
      // one statement per call: prepared statements cannot hold several
      for (const statement of m.sql.split(";").map((x) => x.trim()).filter(Boolean)) {
        await tx.execute(sql.raw(statement));
      }
      await tx.execute(sql`INSERT INTO polly_migrations (id) VALUES (${m.id})`);
    });
  }
}

export function getDb(): Promise<Db> {
  if (!shared.__pollyDb) {
    const ready = connect().then(async (db) => {
      await migrate(db);
      return db;
    });
    ready.catch(() => { shared.__pollyDb = null; });
    shared.__pollyDb = ready;
  }
  return shared.__pollyDb;
}
