import { expect, test, type Page } from "@playwright/test";

const SAL = "/urun/van-gogh-badem-cicegi-hint-ipegi-sal-70x175-turkuaz"; // stok 3
const ESARP_SON1 = "/urun/van-gogh-badem-cicegi-ipek-esarp-95x95-sari"; // stok 1
const TUKENDI = "/urun/sal-deseni-hint-ipegi-sal-70x175-lacivert"; // stok 0

test.beforeEach(async ({ context }) => {
  // Çerez bandı testleri engellemesin.
  await context.addInitScript(() =>
    localStorage.setItem("hera-cerez-tercihi", JSON.stringify({ necessary: true, analytics: false, marketing: false, at: "test" })),
  );
});

async function noHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw).toBeLessThanOrEqual(cw);
}

test("anasayfa açılıyor, taşma yok", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Duvardan");
  await expect(page.getByRole("heading", { name: "Yeni gelenler" })).toBeVisible();
  await noHorizontalScroll(page);
});

test("sepet sayfa yenilenince korunuyor, stoktan fazla eklenemiyor", async ({ page }) => {
  await page.goto(ESARP_SON1);
  await page.getByRole("button", { name: "Sepete ekle" }).first().click();
  await expect(page.getByRole("dialog", { name: /Sepetiniz/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Tamamı sepetinizde" }).first()).toBeDisabled();

  await page.goto("/sepet");
  await page.reload();
  const lines = page.locator('section[aria-label="Sepetteki ürünler"] li');
  await expect(lines).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Artır" })).toHaveAttribute("aria-disabled", "true");
});

test("tükenen ürün sayfası açılıyor, sepete eklenemiyor, haber ver formu var", async ({ page }) => {
  await page.goto(TUKENDI);
  await expect(page.getByRole("button", { name: "Tükendi" })).toBeDisabled();
  await expect(page.getByLabel("Gelince haber ver")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sepete ekle" })).toHaveCount(0);
});

test("filtre URL'de tutuluyor ve sunucuda uygulanıyor", async ({ page }) => {
  await page.goto("/koleksiyon/tumu?tip=esarp&sirala=fiyat-artan");
  await expect(page.getByText(/^6 ürün$/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/^6 ürün$/)).toBeVisible();
});

test("arama: 'vangogh' ve 'Van Gogh' aynı sonucu verir", async ({ page }) => {
  await page.goto("/");
  const count = async (q: string) => {
    await page.getByRole("button", { name: "Ara" }).click();
    await page.getByRole("searchbox").fill(q);
    const n = await page.getByRole("dialog", { name: "Ara" }).locator("li a").count();
    await page.keyboard.press("Escape");
    return n;
  };
  const a = await count("vangogh");
  expect(a).toBeGreaterThan(0);
  expect(await count("Van Gogh")).toBe(a);
});

test("ödeme: boş form hata verir, dolu form sipariş sayfasına gider", async ({ page }) => {
  await page.goto(SAL);
  await page.getByRole("button", { name: "Sepete ekle" }).first().click();
  await page.goto("/odeme");
  await page.getByRole("button", { name: /Siparişi tamamla/ }).click();
  await expect(page.getByText("Geçerli bir e-posta adresi yazın.")).toBeVisible();

  await page.locator('[name="email"]').fill("ornek@example.com");
  await page.getByLabel("Cep telefonu").fill("0532 123 45 67");
  await page.locator('[name="shipping.firstName"]').fill("Ayşe");
  await page.locator('[name="shipping.lastName"]').fill("Yılmaz");
  await page.locator('[name="shipping.il"]').selectOption("İzmir");
  await page.locator('[name="shipping.ilce"]').selectOption("Karşıyaka");
  await page.locator('[name="shipping.address"]').fill("Bostanlı Mah. 1234 Sok. No: 5 D: 3");
  await page.getByLabel(/Ön bilgilendirme formunu/).check();
  await page.getByLabel(/Mesafeli satış sözleşmesini/).check();
  await page.getByRole("button", { name: /Siparişi tamamla/ }).click();
  await expect(page).toHaveURL(/\/siparis\/HR-\d{8}-\d{4}$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Teşekkürler");
});

test("bilinmeyen adres 404 gösterir", async ({ page }) => {
  await page.goto("/boyle-bir-sayfa-yok");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bu duvar");
});
