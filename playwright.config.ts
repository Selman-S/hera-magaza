import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3100;
const testDb = process.env.TEST_DATABASE_URL;
if (!testDb) throw new Error("TEST_DATABASE_URL tanımlı değil (.env.local) — e2e testleri ayrı veritabanında çalışır.");

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  // Testler aynı veritabanını paylaşır (stok, sipariş): sırayla çalışır.
  workers: 1,
  fullyParallel: false,
  use: { baseURL: `http://localhost:${PORT}`, channel: "chrome" },
  projects: [
    { name: "mobil", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "masaustu", use: { viewport: { width: 1280, height: 800 }, channel: "chrome" } },
  ],
  webServer: {
    // Test veritabanı sıfırlanır; derleme ve sunucu bu veritabanını kullanır (geliştirme verisine dokunulmaz).
    command: `pnpm exec tsx scripts/e2e-db.ts && pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { DATABASE_URL: testDb, E2E_DATABASE: "1", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, PAYMENT_MOCK: "1" },
  },
});
