import { pendingMigrations } from "../../scripts/migration-plan.mjs";

/** Neon only. PGLite is not used. */
export type DbSource = "neon";

const databaseUrl =
  typeof process !== "undefined" && process.env.DATABASE_URL?.trim()
    ? process.env.DATABASE_URL.trim()
    : "";

export const dbSource: DbSource = "neon";

export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __neonMigrate__?: Promise<void>;
};

const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

async function migrate(pool: import("pg").Pool): Promise<void> {
  const migrations = import.meta.glob("/migrations/*.sql", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  const client = await pool.connect();
  try {
    await client.query(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const applied = (
      await client.query<{ name: string }>("select name from _migrations")
    ).rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(Object.keys(migrations), applied)) {
      try {
        await client.query("begin");
        await client.query(migrations[path]);
        await client.query("insert into _migrations (name) values ($1)", [name]);
        await client.query("commit");
      } catch (err) {
        try {
          await client.query("rollback");
        } catch {
          /* keep original */
        }
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

function createNeonSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    if (!databaseUrl) {
      throw new Error("Задайте DATABASE_URL — строка подключения Neon.");
    }
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    globalRef.__neonMigrate__ ??= migrate(pool).catch((err) => {
      globalRef.__neonMigrate__ = undefined;
      throw err;
    });
    await globalRef.__neonMigrate__;
    return toSql(async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    });
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

export function getSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader.",
    );
  }
  return createNeonSql();
}

export function ensureDbReady(): Promise<void> {
  return Promise.resolve();
}

export async function getPglite(): Promise<never> {
  throw new Error("PGLite удалён. Данные хранятся только в Neon (DATABASE_URL).");
}
