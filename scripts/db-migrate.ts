import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/lib/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL yok (.env.local)");
  const { db, close } = createDb(url, { max: 1 });
  await migrate(db, { migrationsFolder: "drizzle" });
  await close();
  console.log("✓ Migration'lar uygulandı");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
