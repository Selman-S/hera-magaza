import { createDb } from "../src/lib/db";
import { seedDatabase } from "../src/lib/db/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL yok (.env.local)");
  const { db, close } = createDb(url, { max: 1 });
  await db.transaction((tx) => seedDatabase(tx, { log: (m) => console.log("·", m) }));
  await close();
  console.log("✓ Seed tamamlandı");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
