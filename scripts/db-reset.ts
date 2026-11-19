import postgres from "postgres";

/** Yalnızca yerel geliştirme: tüm şemayı siler. Uzak sunucuda çalışmayı reddeder. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL yok (.env.local)");
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`db:reset yalnızca yerel veritabanında çalışır (host: ${host})`);
  }
  const sql = postgres(url, { max: 1 });
  await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await sql.end();
  console.log("✓ Yerel veritabanı sıfırlandı");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
