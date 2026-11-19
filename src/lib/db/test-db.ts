/** Entegrasyon testleri için: test veritabanını sıfırla, migrate et, seed'le. */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { createDb, type Db } from "./index";
import { seedDatabase } from "./seed";

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL tanımlı değil (.env.local).");
  // E2E sunucusu bilerek DATABASE_URL = TEST_DATABASE_URL ile çalışır; diğer durumlarda geliştirme verisini koru.
  if (url === process.env.DATABASE_URL && process.env.E2E_DATABASE !== "1") throw new Error("TEST_DATABASE_URL, DATABASE_URL ile aynı olamaz (testler tabloları siler).");
  return url;
}

export async function setupTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const url = testDatabaseUrl();
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  await admin.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await admin.end();
  const { db, close } = createDb(url, { max: 10 });
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.transaction((tx) => seedDatabase(tx));
  return { db, close };
}
