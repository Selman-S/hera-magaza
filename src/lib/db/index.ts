import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
/** Transaction içindeki istemci; db ile aynı sorgu API'si. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

export function createDb(url: string, options: { max?: number } = {}): { db: Db; close: () => Promise<void> } {
  const client = postgres(url, { max: options.max ?? 10, prepare: false });
  return { db: drizzle(client, { schema, casing: "snake_case" }), close: () => client.end() };
}

// Geliştirmede sıcak yeniden yüklemede bağlantı havuzunun çoğalmasını önle.
const globalForDb = globalThis as unknown as { heraDb?: Db };

/** Uygulamanın paylaşılan veritabanı bağlantısı. Yalnızca sunucuda kullanılır. */
export function getDb(): Db {
  if (globalForDb.heraDb) return globalForDb.heraDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL tanımlı değil. .env.local dosyasına ekleyin (bkz. .env.example).");
  }
  const { db } = createDb(url);
  globalForDb.heraDb = db;
  return db;
}

export { schema };
