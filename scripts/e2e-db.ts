/** E2E öncesi: test veritabanını sıfırla, migrate et, seed'le, test yöneticisini oluştur. */
import { adminUsers } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { setupTestDb } from "../src/lib/db/test-db";

async function main() {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD yok (.env.local)");
  const { db, close } = await setupTestDb();
  await db.insert(adminUsers).values({ email, name: "E2E yöneticisi", passwordHash: await hashPassword(password), role: "owner" });
  await close();
  console.log("✓ E2E test veritabanı hazır");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
