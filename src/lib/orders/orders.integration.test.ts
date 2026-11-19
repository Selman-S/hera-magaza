import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { setupTestDb } from "@/lib/db/test-db";
import { priceCart } from "@/lib/data/cart";
import type { CheckoutInput } from "@/lib/checkout/schema";
import { createOrder } from "./create";
import { cancelExpiredOrders, transitionOrder } from "./transitions";

let db: Db;
let close: () => Promise<void>;

const SAL = "hr-010"; // Badem Çiçeği Hint İpeği Şal – Turkuaz (seed stok 3, 1.199 TL)
const ESARP = "hr-017"; // Badem Çiçeği İpek Eşarp – Sarı (seed stok 1)

const checkout = (email: string): CheckoutInput => ({
  email,
  phone: "0532 123 45 67",
  shipping: { firstName: "Ayşe", lastName: "Yılmaz", il: "İzmir", ilce: "Karşıyaka", address: "Bostanlı Mah. 1234 Sok. No: 5 D: 3" },
  billingSameAsShipping: true,
  billingType: "bireysel",
  shippingMethod: "standart",
  paymentMethod: "kart",
  acceptPreInfo: true,
  acceptDistanceSale: true,
});

async function stockOf(id: string) {
  const [p] = await db.select({ stock: s.products.stock }).from(s.products).where(eq(s.products.id, id));
  return p.stock;
}
async function setStock(id: string, stock: number) {
  await db.update(s.products).set({ stock }).where(eq(s.products.id, id));
}

beforeAll(async () => {
  ({ db, close } = await setupTestDb());
});
afterAll(async () => {
  await close?.();
});
beforeEach(async () => {
  // Önceki testlerden kalan bekleyen siparişler süre temizliğine karışmasın.
  await db.update(s.orders).set({ status: "cancelled", expiresAt: null }).where(eq(s.orders.status, "pending_payment"));
  await setStock(SAL, 3);
  await setStock(ESARP, 1);
});

describe("sepet fiyatlandırma (sunucu)", () => {
  it("istemci fiyatı kullanılmaz; fiyat ve toplam veritabanından gelir", async () => {
    const r = await priceCart(db, { lines: [{ productId: SAL, quantity: 1, giftWrap: false, giftNote: "" }] }, { clientPrices: { [SAL]: 100 } });
    expect(r.lines[0].priceKurus).toBe(119_900);
    expect(r.totals.totalKurus).toBe(119_900);
    expect(r.issues).toContainEqual(expect.objectContaining({ type: "price_changed", productId: SAL }));
  });

  it("stoktan fazla adet stoğa indirilir, tükenen ve olmayan ürün çıkarılır", async () => {
    await setStock(ESARP, 0);
    const r = await priceCart(db, {
      lines: [
        { productId: SAL, quantity: 9, giftWrap: false, giftNote: "" },
        { productId: ESARP, quantity: 1, giftWrap: false, giftNote: "" },
        { productId: "hr-999", quantity: 1, giftWrap: false, giftNote: "" },
      ],
    });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(3);
    expect(r.issues.map((i) => i.type).sort()).toEqual(["reduced", "removed", "removed"]);
  });

  it("kupon veritabanından doğrulanır (Türkçe İ ile yazılsa bile)", async () => {
    const r = await priceCart(db, { lines: [{ productId: SAL, quantity: 1, giftWrap: false, giftNote: "" }], couponCode: "hosgeldİn10" });
    expect(r.couponError).toBeNull();
    expect(r.totals.discountKurus).toBe(11_990);
  });
});

describe("sipariş oluşturma", () => {
  it("siparişi pending_payment olarak açar, stok düşer, hareket ve onay kayıtları yazılır", async () => {
    const r = await createOrder(db, {
      checkout: checkout("musteri1@example.com"),
      cart: { lines: [{ productId: SAL, quantity: 2, giftWrap: true, giftNote: "İyi ki varsın" }], couponCode: "HOSGELDIN10" },
      marketingConsent: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.orderNo).toMatch(/^HR-\d{4}-\d{5}$/);
    expect(await stockOf(SAL)).toBe(1);

    const [order] = await db.select().from(s.orders).where(eq(s.orders.id, r.orderId));
    expect(order.status).toBe("pending_payment");
    expect(order.subtotalKurus).toBe(239_800);
    expect(order.discountKurus).toBe(23_980);
    expect(order.totalKurus).toBe(239_800 - 23_980);
    expect(order.shippingAddress.city).toBe("İzmir");
    expect(order.expiresAt).not.toBeNull();

    const moves = await db.select().from(s.inventoryMovements).where(and(eq(s.inventoryMovements.refId, r.orderNo)));
    expect(moves).toEqual([expect.objectContaining({ productId: SAL, delta: -2, reason: "order" })]);
    const consents = await db.select().from(s.consentLogs).where(eq(s.consentLogs.orderId, r.orderId));
    expect(consents.map((c) => c.type).sort()).toEqual(["distance_sales", "etk", "kvkk", "pre_info"]);
    const [coupon] = await db.select().from(s.coupons).where(eq(s.coupons.code, "HOSGELDIN10"));
    expect(coupon.usedCount).toBeGreaterThanOrEqual(1);
  });

  it("aynı tek stoklu ürüne eşzamanlı iki sipariş: biri başarılı, diğeri stok hatası", async () => {
    const attempt = (email: string) =>
      createOrder(db, {
        checkout: checkout(email),
        cart: { lines: [{ productId: ESARP, quantity: 1, giftWrap: false, giftNote: "" }] },
        marketingConsent: false,
      });
    const results = await Promise.all([attempt("a@example.com"), attempt("b@example.com")]);
    const ok = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ ok: false, code: "stock" });
    expect(await stockOf(ESARP)).toBe(0);
  });

  it("geçersiz form siparişi reddeder ve stoğa dokunmaz", async () => {
    const r = await createOrder(db, {
      checkout: { ...checkout("x@example.com"), acceptDistanceSale: false as unknown as true },
      cart: { lines: [{ productId: SAL, quantity: 1, giftWrap: false, giftNote: "" }] },
      marketingConsent: false,
    });
    expect(r).toMatchObject({ ok: false, code: "invalid" });
    expect(await stockOf(SAL)).toBe(3);
  });

  it("kapalı ödeme yöntemi reddedilir", async () => {
    const r = await createOrder(db, {
      checkout: { ...checkout("y@example.com"), paymentMethod: "kapida" },
      cart: { lines: [{ productId: SAL, quantity: 1, giftWrap: false, giftNote: "" }] },
      marketingConsent: false,
    });
    expect(r).toMatchObject({ ok: false, code: "invalid" });
  });
});

describe("durum geçişleri ve stok iadesi", () => {
  async function newOrder(email: string, qty = 1) {
    const r = await createOrder(db, {
      checkout: checkout(email),
      cart: { lines: [{ productId: SAL, quantity: qty, giftWrap: false, giftNote: "" }] },
      marketingConsent: false,
    });
    if (!r.ok) throw new Error("sipariş açılamadı");
    return r;
  }

  it("iptal stoğu iade eder; geçersiz geçiş engellenir", async () => {
    const o = await newOrder("iptal@example.com", 2);
    expect(await stockOf(SAL)).toBe(1);
    expect(await transitionOrder(db, o.orderId, "shipped", "admin:test")).toMatchObject({ ok: false, reason: "invalid_transition" });
    expect(await transitionOrder(db, o.orderId, "cancelled", "admin:test")).toMatchObject({ ok: true });
    expect(await stockOf(SAL)).toBe(3);
    // İkinci iptal: son durumdan çıkış yok, stok iki kez iade edilmez.
    expect(await transitionOrder(db, o.orderId, "cancelled", "admin:test")).toMatchObject({ ok: false });
    expect(await stockOf(SAL)).toBe(3);
  });

  it("süresi dolan ödenmemiş sipariş iptal edilir ve stok iade edilir", async () => {
    const o = await newOrder("sure@example.com");
    expect(await stockOf(SAL)).toBe(2);
    const future = new Date(Date.now() + 31 * 60_000);
    const cancelled = await cancelExpiredOrders(db, future);
    expect(cancelled).toContain(o.orderNo);
    expect(await stockOf(SAL)).toBe(3);
    const [row] = await db.select().from(s.orders).where(eq(s.orders.id, o.orderId));
    expect(row.status).toBe("cancelled");
  });

  it("ödenmiş sipariş süre dolsa da iptal edilmez", async () => {
    const o = await newOrder("odendi@example.com");
    await transitionOrder(db, o.orderId, "paid", "sistem");
    const cancelled = await cancelExpiredOrders(db, new Date(Date.now() + 60 * 60_000));
    expect(cancelled).not.toContain(o.orderNo);
    expect(await stockOf(SAL)).toBe(2);
  });
});
