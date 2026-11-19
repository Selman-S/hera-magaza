import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: `http://localhost:${PORT}`, channel: "chrome" },
  projects: [
    { name: "mobil", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "masaustu", use: { viewport: { width: 1280, height: 800 }, channel: "chrome" } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
