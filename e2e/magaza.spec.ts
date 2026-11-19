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

async function fillCheckout(page: Page, email: string) {
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="phone"]').fill("0532 123 45 67");
  await page.locator('[name="shipping.firstName"]').fill("Ayşe");
  await page.locator('[name="shipping.lastName"]').fill("Yılmaz");
  await page.locator('[name="shipping.il"]').selectOption("İzmir");
  await page.locator('[name="shipping.ilce"]').selectOption("Karşıyaka");
  await page.locator('[name="shipping.address"]').fill("Bostanlı Mah. 1234 Sok. No: 5 D: 3");
  await page.getByLabel(/Ön bilgilendirme formunu/).check();
  await page.getByLabel(/Mesafeli satış sözleşmesini/).check();
}

test("anasayfa açılıyor, taşma yok", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Duvardan");
  await expect(page.getByRole("heading", { name: "Yeni gelenler" })).toBeVisible();
  await noHorizontalScroll(page);
});

test("tükenen ürün sayfası açılıyor, sepete eklenemiyor, haber ver kaydı alınıyor", async ({ page }) => {
  await page.goto(TUKENDI);
  await expect(page.getByRole("button", { name: "Tükendi" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sepete ekle" })).toHaveCount(0);
  await page.getByLabel("Gelince haber ver").fill(`haber-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Haber ver" }).click();
  await expect(page.getByRole("status")).toContainText("yeniden gelirse");
});

test("filtre URL'de tutuluyor ve sunucuda uygulanıyor", async ({ page }) => {
  await page.goto("/koleksiyon/tumu?tip=esarp&sirala=fiyat-artan");
  await expect(page.getByText(/^\d+ ürün$/)).toHaveText(/^6 ürün$/);
  await page.reload();
  await expect(page.getByText(/^\d+ ürün$/)).toHaveText(/^6 ürün$/);
});

test("arama: 'vangogh' ve 'Van Gogh' aynı sonucu verir", async ({ page }) => {
  await page.goto("/");
  const count = async (q: string) => {
    await page.getByRole("button", { name: "Ara" }).click();
    await page.getByRole("searchbox").fill(q);
    const results = page.getByRole("dialog", { name: "Ara" }).locator("li a");
    await expect(results.first()).toBeVisible();
    const n = await results.count();
    await page.keyboard.press("Escape");
    return n;
  };
  const a = await count("vangogh");
  expect(a).toBeGreaterThan(0);
  expect(await count("Van Gogh")).toBe(a);
});

test("sepet yenilemede korunuyor; stoktan fazla eklenemiyor", async ({ page }) => {
  await page.goto(SAL);
  await page.getByRole("button", { name: "Sepete ekle" }).first().click();
  await expect(page.getByRole("dialog", { name: /Sepetiniz/ })).toBeVisible();
  await page.goto("/sepet");
  await page.reload();
  await expect(page.locator('section[aria-label="Sepetteki ürünler"] li')).toHaveCount(1);
  // Stok 3: üçe kadar artar, sonra artır pasif.
  const plus = page.getByRole("button", { name: "Artır" });
  await plus.click();
  await plus.click();
  await expect(plus).toHaveAttribute("aria-disabled", "true");
});

test("ödeme: boş form hata verir; dolu form 'ödeme bekleniyor' siparişi açar ve stok düşer", async ({ page }) => {
  await page.goto(ESARP_SON1);
  await page.getByRole("button", { name: "Sepete ekle" }).first().click();
  await page.goto("/odeme");
  await page.getByRole("button", { name: /Siparişi tamamla/ }).click();
  await expect(page.getByText("Geçerli bir e-posta adresi yazın.")).toBeVisible();

  await fillCheckout(page, `e2e-${test.info().project.name}@example.com`);
  await page.getByLabel(/Havale \/ EFT/).check();
  await page.getByRole("button", { name: /Siparişi tamamla/ }).click();
  await expect(page).toHaveURL(/\/siparis\/HR-\d{4}-\d{5}$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Teşekkürler");
  await expect(page.getByText("Ödeme bekleniyor")).toBeVisible();

  // Tek stoklu eşarp artık tükendi.
  await page.goto(ESARP_SON1);
  await expect(page.getByRole("button", { name: "Tükendi" })).toBeDisabled();
});

test("kartla ödeme: test ödemesi siparişi 'Ödendi' yapar, kupon Enter ile uygulanır", async ({ page }) => {
  await page.goto(SAL);
  await page.getByRole("button", { name: "Sepete ekle" }).first().click();
  await page.goto("/odeme");
  await fillCheckout(page, `kart-${test.info().project.name}@example.com`);
  // Kupon alanı ana formun içinde: Enter siparişi göndermemeli, kuponu uygulamalı.
  const summary = page.getByText(/Sipariş özetini göster/);
  if (await summary.isVisible()) await summary.click(); // mobil: özet katlanmış
  const coupon = page.getByRole("textbox", { name: "Kupon kodu" }).filter({ visible: true });
  await coupon.fill("hosgeldin10");
  await coupon.press("Enter");
  await expect(page.getByText(/Kupon: HOSGELDIN10/).filter({ visible: true })).toBeVisible();
  await expect(page).toHaveURL(/\/odeme$/);
  await page.getByRole("button", { name: /Siparişi tamamla/ }).click();
  await expect(page).toHaveURL(/\/odeme\/kart\/HR-\d{4}-\d{5}$/);
  await page.getByRole("button", { name: "Başarılı ödeme" }).click();
  await expect(page).toHaveURL(/\/siparis\/HR-\d{4}-\d{5}\?odeme=tamam$/);
  await expect(page.getByText("Ödendi")).toBeVisible();
});

test("yönetim: giriş, bekleyen siparişi iptal etme (stok iadesi)", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/giris$/);
  await page.getByLabel("E-posta").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Şifre").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByRole("heading", { name: "Gösterge" })).toBeVisible();

  await page.goto("/admin/siparisler?durum=pending_payment");
  const first = page.locator("table a").first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByText("Ödeme bekleniyor").first()).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "İptal edildi" }).click();
  await expect(page.getByText("İptal edildi").first()).toBeVisible();
});

test("bilinmeyen adres 404 gösterir", async ({ page }) => {
  const res = await page.goto("/boyle-bir-sayfa-yok");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bu duvar");
});
