import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { setupTestDb } from "@/lib/db/test-db";
import type { CheckoutInput } from "@/lib/checkout/schema";
import { createOrder } from "@/lib/orders/create";
import { notifyBackInStock, runOrderEffects } from "@/lib/orders/effects";
import { processPaytrCallback } from "@/lib/payments/process";
import { paytrCallbackHash, toMerchantOid } from "./paytr/hash";
import type { TrendyolClient, TrendyolPackage } from "./trendyol/client";
import { enqueueStockSync, pullTrendyolOrders, pushStockQueue } from "./trendyol/sync";

let db: Db;
let close: () => Promise<void>;
const creds = { merchantKey: "test-key", merchantSalt: "test-salt" };
const SAL = "hr-010"; // stok 3
const ESARP = "hr-017"; // stok 1

const checkout = (email: string, paymentMethod: "kart" | "havale" = "kart"): CheckoutInput => ({
  email,
  phone: "0532 123 45 67",
  shipping: { firstName: "Ayşe", lastName: "Yılmaz", il: "İzmir", ilce: "Karşıyaka", address: "Bostanlı Mah. 1234 Sok. No: 5 D: 3" },
  billingSameAsShipping: true,
  billingType: "bireysel",
  shippingMethod: "standart",
  paymentMethod,
  acceptPreInfo: true,
  acceptDistanceSale: true,
});

async function stockOf(id: string) {
  const [p] = await db.select({ stock: s.products.stock }).from(s.products).where(eq(s.products.id, id));
  return p.stock;
}
async function newOrder(email: string, productId = SAL, method: "kart" | "havale" = "kart") {
  const r = await createOrder(db, { checkout: checkout(email, method), cart: { lines: [{ productId, quantity: 1, giftWrap: false, giftNote: "" }] }, marketingConsent: false });
  if (!r.ok) throw new Error(`sipariş açılamadı: ${JSON.stringify(r)}`);
  return r;
}
const signed = (merchantOid: string, status: string, totalAmount: string) => ({
  merchant_oid: merchantOid,
  status,
  total_amount: totalAmount,
  payment_amount: totalAmount,
  hash: paytrCallbackHash(creds, { merchantOid, status, totalAmount }),
});

beforeAll(async () => {
  ({ db, close } = await setupTestDb());
  await db.update(s.products).set({ barcode: "BRK-SAL" }).where(eq(s.products.id, SAL));
  await db.update(s.products).set({ barcode: "BRK-ESARP" }).where(eq(s.products.id, ESARP));
});
afterAll(async () => {
  await close?.();
});
beforeEach(async () => {
  await db.update(s.orders).set({ status: "cancelled", expiresAt: null }).where(eq(s.orders.status, "pending_payment"));
  await db.update(s.products).set({ stock: 3 }).where(eq(s.products.id, SAL));
  await db.update(s.products).set({ stock: 1 }).where(eq(s.products.id, ESARP));
  await db.delete(s.trendyolStockQueue);
});

describe("PayTR bildirimi", () => {
  it("bozuk hash siparişi değiştirmez", async () => {
    const o = await newOrder("hash@example.com");
    const oid = toMerchantOid(o.orderNo);
    const r = await processPaytrCallback(db, creds, { ...signed(oid, "success", String(o.totalKurus)), hash: "sahte" });
    expect(r.kind).toBe("bad_hash");
    const [row] = await db.select().from(s.orders).where(eq(s.orders.id, o.orderId));
    expect(row.status).toBe("pending_payment");
  });

  it("tutar değiştirilmiş bildirim (hash eski tutarla) reddedilir", async () => {
    const o = await newOrder("tutar@example.com");
    const oid = toMerchantOid(o.orderNo);
    const good = signed(oid, "success", String(o.totalKurus));
    const r = await processPaytrCallback(db, creds, { ...good, total_amount: "100" });
    expect(r.kind).toBe("bad_hash");
  });

  it("başarılı bildirim siparişi 'paid' yapar; tekrar gelen bildirim bir kez işlenir", async () => {
    const o = await newOrder("odeme@example.com");
    const oid = toMerchantOid(o.orderNo);
    const cb = signed(oid, "success", String(o.totalKurus));
    expect((await processPaytrCallback(db, creds, cb)).kind).toBe("paid");
    expect((await processPaytrCallback(db, creds, cb)).kind).toBe("duplicate");
    const [row] = await db.select().from(s.orders).where(eq(s.orders.id, o.orderId));
    expect(row.status).toBe("paid");
    expect(row.paymentStatus).toBe("paid");
    const pays = await db.select().from(s.payments).where(eq(s.payments.orderId, o.orderId));
    expect(pays).toHaveLength(1);
  });

  it("başarısız ödeme siparişi ödeme bekliyor durumunda bırakır (tekrar denenebilir)", async () => {
    const o = await newOrder("red@example.com");
    const oid = toMerchantOid(o.orderNo);
    expect((await processPaytrCallback(db, creds, signed(oid, "failed", String(o.totalKurus)))).kind).toBe("failed");
    const [row] = await db.select().from(s.orders).where(eq(s.orders.id, o.orderId));
    expect(row.status).toBe("pending_payment");
    expect((await processPaytrCallback(db, creds, signed(oid, "success", String(o.totalKurus)))).kind).toBe("paid");
  });

  it("iptal edilmiş siparişe geç gelen ödeme siparişi canlandırmaz, günlüğe yazılır", async () => {
    const o = await newOrder("gec@example.com");
    await db.update(s.orders).set({ status: "cancelled" }).where(eq(s.orders.id, o.orderId));
    const r = await processPaytrCallback(db, creds, signed(toMerchantOid(o.orderNo), "success", String(o.totalKurus)));
    expect(r.kind).toBe("late");
    const logs = await db.select().from(s.syncLogs).where(eq(s.syncLogs.source, "paytr"));
    expect(logs.some((l) => l.message.includes(o.orderNo))).toBe(true);
  });
});

describe("sipariş yan etkileri", () => {
  it("ödeme sonrası müşteri e-postası (mock) ve fatura (mock) oluşur", async () => {
    const o = await newOrder("efekt@example.com");
    await processPaytrCallback(db, creds, signed(toMerchantOid(o.orderNo), "success", String(o.totalKurus)));
    await runOrderEffects(db, o.orderId, "paid");
    const mails = await db.select().from(s.emailLogs).where(eq(s.emailLogs.orderId, o.orderId));
    expect(mails.map((m) => m.template)).toContain("odeme-alindi");
    expect(mails.every((m) => m.status === "mocked")).toBe(true);
    expect(mails[0].html).toContain(o.orderNo);
    const [row] = await db.select().from(s.orders).where(eq(s.orders.id, o.orderId));
    expect(row.invoiceStatus).toBe("issued");
    expect(row.invoiceNo).toMatch(/^MOK/);
  });

  it("havale siparişinde IBAN bilgisi e-postası gider ve süre 24 saattir", async () => {
    const o = await newOrder("havale@example.com", SAL, "havale");
    await runOrderEffects(db, o.orderId, "created");
    const mails = await db.select().from(s.emailLogs).where(and(eq(s.emailLogs.orderId, o.orderId), eq(s.emailLogs.template, "havale")));
    expect(mails).toHaveLength(1);
    const [row] = await db.select().from(s.orders).where(eq(s.orders.id, o.orderId));
    expect(row.expiresAt!.getTime() - row.createdAt.getTime()).toBeGreaterThan(23 * 3_600_000);
  });

  it("stoğa dönen ürün için 'gelince haber ver' e-postası bir kez gider", async () => {
    await db.update(s.products).set({ stock: 0 }).where(eq(s.products.id, ESARP));
    await db.insert(s.backInStockRequests).values({ productId: ESARP, email: "bekleyen@example.com" }).onConflictDoNothing();
    expect(await notifyBackInStock(db, [ESARP])).toBe(0); // stok 0: gönderilmez
    await db.update(s.products).set({ stock: 1 }).where(eq(s.products.id, ESARP));
    expect(await notifyBackInStock(db, [ESARP])).toBe(1);
    expect(await notifyBackInStock(db, [ESARP])).toBe(0);
  });
});

describe("Trendyol senkronu", () => {
  function fakeClient(packages: TrendyolPackage[], opts: { failPush?: boolean } = {}) {
    const pushes: Array<Array<{ barcode: string; quantity: number }>> = [];
    const client: TrendyolClient = {
      mode: "mock",
      async updateStock(items) {
        if (opts.failPush) throw new Error("503 Service Unavailable");
        pushes.push(items);
        return { batchRequestId: "batch-1" };
      },
      async listPackages() {
        return { content: packages, totalPages: 1 };
      },
    };
    return { client, pushes };
  }
  const pkg = (id: string, status: string, barcode: string, quantity = 1): TrendyolPackage => ({
    shipmentPackageId: id,
    orderNumber: `TY-${id}`,
    status,
    lastModifiedDate: Date.now(),
    lines: [{ barcode, quantity }],
  });

  it("Trendyol satışı sitede stok düşürür; aynı paket ikinci kez işlenmez", async () => {
    const { client } = fakeClient([pkg("P1", "Created", "BRK-SAL")]);
    const r1 = await pullTrendyolOrders(db, client);
    expect(r1.productIds).toEqual([SAL]);
    expect(await stockOf(SAL)).toBe(2);
    await pullTrendyolOrders(db, client);
    expect(await stockOf(SAL)).toBe(2);
    const moves = await db.select().from(s.inventoryMovements).where(and(eq(s.inventoryMovements.reason, "trendyol_sale"), eq(s.inventoryMovements.refId, "TY-P1")));
    expect(moves).toHaveLength(1);
  });

  it("tek stoklu ürün Trendyol'da satılınca sitede tükenir; iptal edilince geri gelir", async () => {
    await pullTrendyolOrders(db, fakeClient([pkg("P2", "Created", "BRK-ESARP")]).client);
    expect(await stockOf(ESARP)).toBe(0);
    await pullTrendyolOrders(db, fakeClient([pkg("P2", "Cancelled", "BRK-ESARP")]).client);
    expect(await stockOf(ESARP)).toBe(1);
  });

  it("sitede stok yokken Trendyol satışı: stok eksiye düşmez, çift satış günlüğe yazılır", async () => {
    await db.update(s.products).set({ stock: 0 }).where(eq(s.products.id, ESARP));
    await pullTrendyolOrders(db, fakeClient([pkg("P3", "Created", "BRK-ESARP")]).client);
    expect(await stockOf(ESARP)).toBe(0);
    const logs = await db.select().from(s.syncLogs).where(eq(s.syncLogs.level, "error"));
    expect(logs.some((l) => l.message.includes("ÇİFT SATIŞ"))).toBe(true);
  });

  it("sitede satılan ürünün Trendyol stoğu, gönderim anındaki değerle güncellenir", async () => {
    await newOrder("ty@example.com", ESARP);
    await enqueueStockSync(db, [ESARP]);
    const { client, pushes } = fakeClient([]);
    const r = await pushStockQueue(db, client);
    expect(r.sent).toBe(1);
    expect(pushes[0]).toEqual([{ barcode: "BRK-ESARP", quantity: 0 }]);
  });

  it("Trendyol hatasında kuyruk bekletilir ve tekrar denenir", async () => {
    await enqueueStockSync(db, [SAL]);
    const now = new Date();
    const r = await pushStockQueue(db, fakeClient([], { failPush: true }).client, now);
    expect(r.failed).toBe(1);
    const [q] = await db.select().from(s.trendyolStockQueue).where(eq(s.trendyolStockQueue.productId, SAL));
    expect(q.status).toBe("pending");
    expect(q.attempts).toBe(1);
    expect(q.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());
    // Bekleme süresi dolmadan tekrar gönderilmez
    const { client, pushes } = fakeClient([]);
    expect((await pushStockQueue(db, client, now)).sent).toBe(0);
    expect((await pushStockQueue(db, client, new Date(now.getTime() + 5 * 60_000))).sent).toBe(1);
    expect(pushes).toHaveLength(1);
  });

  it("barkodu olmayan ürün kuyruğa alınmaz", async () => {
    await enqueueStockSync(db, ["hr-001"]);
    const q = await db.select().from(s.trendyolStockQueue).where(eq(s.trendyolStockQueue.productId, "hr-001"));
    expect(q).toHaveLength(0);
  });
});
