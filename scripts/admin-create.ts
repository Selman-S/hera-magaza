/**
 * İlk yönetici kullanıcıyı oluşturur (veya şifresini yeniler).
 * Kullanım: pnpm admin:create   → e-posta, ad ve şifre sorulur (şifre ekranda görünmez).
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { createDb } from "../src/lib/db";
import { adminUsers } from "../src/lib/db/schema";
import { hashPassword, validatePasswordStrength } from "../src/lib/auth/password";

const muted = { value: false };
const output = new Writable({
  write(chunk, _enc, cb) {
    if (!muted.value) process.stdout.write(chunk);
    cb();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
const ask = (q: string, hidden = false) =>
  new Promise<string>((resolve) => {
    process.stdout.write(q);
    muted.value = hidden;
    rl.question("", (a) => {
      muted.value = false;
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL yok (.env.local)");
  // Etkileşimsiz kullanım (test/CI): ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenleri.
  const nonInteractive = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  const email = (nonInteractive ? process.env.ADMIN_EMAIL! : await ask("E-posta: ")).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Geçersiz e-posta");
  const name = nonInteractive ? process.env.ADMIN_NAME || "Test yöneticisi" : (await ask("Ad: ")) || email;
  const password = nonInteractive ? process.env.ADMIN_PASSWORD! : await ask("Şifre (en az 12 karakter, harf + rakam): ", true);
  const weak = validatePasswordStrength(password);
  if (weak) throw new Error(weak);
  if (!nonInteractive) {
    const again = await ask("Şifre (tekrar): ", true);
    if (again !== password) throw new Error("Şifreler eşleşmiyor");
  }
  rl.close();

  const { db, close } = createDb(url, { max: 1 });
  const passwordHash = await hashPassword(password);
  await db
    .insert(adminUsers)
    .values({ email, name, passwordHash, role: "owner" })
    .onConflictDoUpdate({ target: adminUsers.email, set: { passwordHash, name } });
  await close();
  console.log(`✓ Yönetici hazır: ${email}`);
}

main().catch((e) => {
  rl.close();
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
