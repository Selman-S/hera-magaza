"use server";

/**
 * Yönetim paneli sunucu eylemleri. HER eylem önce requireAdmin() çağırır (proxy yeterli değildir).
 * Vitrini etkileyen değişikliklerden sonra updateTag ile önbellek hemen yenilenir.
 */
import { asc, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/auth/session";
import { audit, diffOf } from "@/lib/admin/audit";
import type { ActionState } from "@/lib/admin/action-state";
import { parseTRYToKurus } from "@/lib/admin/money-input";
import {
  createProduct,
  productFormFromData,
  productFormSchema,
  quickUpdateProduct,
  updateProduct,
} from "@/lib/admin/products";
import { couponFormSchema } from "@/lib/admin/queries";
import { getImageStorage, validateImageFile } from "@/lib/admin/storage";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { REVIEWS_TAG, SETTINGS_TAG } from "@/lib/data/store";
import { fieldErrors as zodFieldErrors } from "@/lib/checkout/schema";
import { transitionOrder } from "@/lib/orders/transitions";
import { issueInvoice, notifyBackInStock, runOrderEffects, type OrderEvent } from "@/lib/orders/effects";
import { runJob } from "@/lib/cron/jobs";
import { enqueueStockSync } from "@/lib/integrations/trendyol/sync";
import { trendyolMockState } from "@/lib/integrations/trendyol/client";
import { DEFAULT_PARCEL, getShippingProvider } from "@/lib/integrations/shipping";
import { integrations } from "@/lib/integrations/config";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { storeSettingsSchema } from "@/lib/store-settings";

async function clientIp() {
  const h = await headers();
  return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

// ── Giriş / çıkış ───────────────────────────────────────────────────────────
export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const meta = await clientIp();
  const key = `login:${meta.ip ?? "?"}:${email}`;
  if (!rateLimit(key, { limit: 5, windowMs: 15 * 60_000 })) {
    return { ok: false, message: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.", values: { email } };
  }
  const [user] = await getDb().select().from(s.adminUsers).where(eq(s.adminUsers.email, email)).limit(1);
  // Kullanıcı yoksa da şifre doğrulaması kadar zaman harca (e-posta varlığı sızmasın).
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==");
  if (!user || !valid) return { ok: false, message: "E-posta veya şifre hatalı.", values: { email } };
  resetRateLimit(key);
  await createAdminSession(user.id, meta);
  redirect("/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/giris");
}

// ── Ürünler ─────────────────────────────────────────────────────────────────
export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const raw = productFormFromData(fd);
  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Lütfen işaretli alanları düzeltin.", fieldErrors: zodFieldErrors(parsed.error), values: raw };
  }
  const db = getDb();
  const actor = `admin:${admin.email}`;
  if (!id) {
    const created = await createProduct(db, parsed.data, actor);
    await audit(db, admin, "create", "product", created.id, { name: parsed.data.name });
    updateTag(CATALOG_TAG);
    redirect(`/admin/urunler/${created.id}?kaydedildi=1`);
  }
  const r = await updateProduct(db, id, parsed.data, actor);
  if (!r) return { ok: false, message: "Ürün bulunamadı." };
  await audit(db, admin, "update", "product", id, diffOf(r.before, r.after));
  updateTag(CATALOG_TAG);
  if (r.before.stock !== r.after.stock || r.before.status !== r.after.status) {
    after(async () => {
      await enqueueStockSync(db, [id]);
      await notifyBackInStock(db, [id]);
    });
  }
  return {
    ok: true,
    message: r.slug !== r.oldSlug ? `Kaydedildi. Adres değişti; eski adres (/urun/${r.oldSlug}) yeni adrese yönlendiriliyor.` : "Kaydedildi.",
  };
}

const quickSchema = z.object({
  id: z.string().min(1),
  stock: z.coerce.number().int().min(0).max(9999).optional(),
  price: z.string().optional(),
  trendyolPrice: z.string().optional(),
});

/** Listeden satır içi stok/fiyat düzenleme. */
export async function quickUpdateAction(input: z.input<typeof quickSchema>): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = quickSchema.safeParse(input);
  if (!p.success) return { ok: false, message: "Geçersiz değer." };
  const patch: { stock?: number; priceKurus?: number; trendyolPriceKurus?: number | null } = {};
  if (p.data.stock !== undefined) patch.stock = p.data.stock;
  if (p.data.price !== undefined) {
    const k = parseTRYToKurus(p.data.price);
    if (!k || k <= 0) return { ok: false, message: "Fiyat geçerli değil." };
    patch.priceKurus = k;
  }
  if (p.data.trendyolPrice !== undefined) {
    patch.trendyolPriceKurus = p.data.trendyolPrice.trim() ? parseTRYToKurus(p.data.trendyolPrice) : null;
    if (p.data.trendyolPrice.trim() && patch.trendyolPriceKurus === null) return { ok: false, message: "Trendyol fiyatı geçerli değil." };
  }
  const db = getDb();
  try {
    const before = await quickUpdateProduct(db, p.data.id, patch, `admin:${admin.email}`);
    if (!before) return { ok: false, message: "Ürün bulunamadı." };
    await audit(db, admin, "quick_update", "product", p.data.id, diffOf(before as unknown as Record<string, unknown>, patch));
    if (patch.stock !== undefined && patch.stock !== before.stock) {
      const pid = p.data.id;
      after(async () => {
        await enqueueStockSync(db, [pid]);
        await notifyBackInStock(db, [pid]);
      });
    }
  } catch (e) {
    if (String(e).includes("compare_at")) return { ok: false, message: "Fiyat, indirimsiz fiyattan düşük olmalı." };
    throw e;
  }
  updateTag(CATALOG_TAG);
  return { ok: true, message: "Güncellendi." };
}

export async function uploadProductImageAction(fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const productId = String(fd.get("productId") ?? "");
  const file = fd.get("file");
  const width = Number(fd.get("width"));
  const height = Number(fd.get("height"));
  const alt = String(fd.get("alt") ?? "").trim();
  if (!(file instanceof File)) return { ok: false, message: "Dosya seçilmedi." };
  const invalid = validateImageFile(file);
  if (invalid) return { ok: false, message: invalid };
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 200 || height < 200) {
    return { ok: false, message: "Görsel en az 200×200 piksel olmalı." };
  }
  const db = getDb();
  const [product] = await db.select({ id: s.products.id, name: s.products.name }).from(s.products).where(eq(s.products.id, productId));
  if (!product) return { ok: false, message: "Ürün bulunamadı." };
  let stored;
  try {
    stored = await getImageStorage().save(file, product.id);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Yükleme başarısız." };
  }
  const [{ n }] = await db
    .select({ n: sql<number>`coalesce(max(position) + 1, 0)::int` })
    .from(s.productImages)
    .where(eq(s.productImages.productId, productId));
  await db.insert(s.productImages).values({ productId, url: stored.url, alt: alt || `${product.name}, görsel`, width, height, position: n });
  await audit(db, admin, "image_upload", "product", productId, { url: stored.url });
  updateTag(CATALOG_TAG);
  return { ok: true, message: "Görsel yüklendi." };
}

export async function updateImagesAction(productId: string, images: Array<{ id: number; alt: string }>): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = z.array(z.object({ id: z.number().int(), alt: z.string().trim().min(5, "Alt metin en az 5 karakter.").max(200) })).safeParse(images);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Geçersiz" };
  const db = getDb();
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: s.productImages.id }).from(s.productImages).where(eq(s.productImages.productId, productId));
    const ids = new Set(existing.map((e) => e.id));
    for (const [position, im] of parsed.data.entries()) {
      if (!ids.has(im.id)) continue;
      await tx.update(s.productImages).set({ position, alt: im.alt }).where(eq(s.productImages.id, im.id));
    }
  });
  await audit(db, admin, "images_reorder", "product", productId);
  updateTag(CATALOG_TAG);
  return { ok: true, message: "Görsel sırası ve alt metinler kaydedildi." };
}

export async function deleteImageAction(imageId: number): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  const [img] = await db.select().from(s.productImages).where(eq(s.productImages.id, imageId));
  if (!img) return { ok: false, message: "Görsel bulunamadı." };
  const others = await db.select({ id: s.productImages.id }).from(s.productImages).where(eq(s.productImages.productId, img.productId)).orderBy(asc(s.productImages.position));
  if (others.length <= 1) return { ok: false, message: "Ürünün en az bir görseli olmalı." };
  await db.delete(s.productImages).where(eq(s.productImages.id, imageId));
  await getImageStorage()
    .remove(img.url)
    .catch(() => {});
  await audit(db, admin, "image_delete", "product", img.productId, { url: img.url });
  updateTag(CATALOG_TAG);
  return { ok: true, message: "Görsel silindi." };
}

// ── Siparişler ──────────────────────────────────────────────────────────────
export async function changeOrderStatusAction(orderId: number, to: OrderStatus, note?: string): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  const r = await transitionOrder(db, orderId, to, `admin:${admin.email}`, note?.trim() || undefined);
  if (!r.ok) {
    return {
      ok: false,
      message:
        r.reason === "not_found"
          ? "Sipariş bulunamadı."
          : `${r.from ? ORDER_STATUS_LABEL[r.from] : "Bu"} durumundan “${ORDER_STATUS_LABEL[to]}” durumuna geçilemez.`,
    };
  }
  await audit(db, admin, "status", "order", r.orderNo, { to });
  updateTag(CATALOG_TAG);
  const EVENTS: Partial<Record<OrderStatus, OrderEvent>> = { paid: "paid", delivered: "delivered", cancelled: "cancelled", refunded: "refunded", returned: "returned" };
  const ev = EVENTS[to];
  if (ev) after(() => runOrderEffects(db, orderId, ev));
  return { ok: true, message: `Durum: ${ORDER_STATUS_LABEL[to]}` };
}

export async function saveOrderNoteAction(orderId: number, note: string): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  await db.update(s.orders).set({ adminNote: note.trim().slice(0, 2000) || null }).where(eq(s.orders.id, orderId));
  await audit(db, admin, "note", "order", orderId);
  return { ok: true, message: "Not kaydedildi." };
}

const shipmentSchema = z.object({
  carrier: z.string().trim().min(2, "Kargo firması gerekli.").max(60),
  trackingNo: z.string().trim().min(4, "Takip numarası gerekli.").max(60),
});

export async function addShipmentAction(orderId: number, input: z.input<typeof shipmentSchema>): Promise<ActionState> {
  const admin = await requireAdmin();
  const p = shipmentSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message };
  const db = getDb();
  const [order] = await db.select({ status: s.orders.status }).from(s.orders).where(eq(s.orders.id, orderId));
  if (!order) return { ok: false, message: "Sipariş bulunamadı." };
  if (!["paid", "preparing"].includes(order.status)) {
    return { ok: false, message: "Kargo bilgisi yalnızca ödenmiş/hazırlanan siparişe girilebilir." };
  }
  if (order.status === "paid") await transitionOrder(db, orderId, "preparing", `admin:${admin.email}`);
  const r = await transitionOrder(db, orderId, "shipped", `admin:${admin.email}`, `${p.data.carrier} ${p.data.trackingNo}`);
  if (!r.ok) return { ok: false, message: "Durum güncellenemedi." };
  await db.insert(s.shipments).values({ orderId, carrier: p.data.carrier, trackingNo: p.data.trackingNo, shippedAt: new Date() });
  await audit(db, admin, "shipment", "order", r.orderNo, p.data);
  const ship = p.data;
  after(() => runOrderEffects(db, orderId, "shipped", { carrier: ship.carrier, trackingNo: ship.trackingNo }));
  return { ok: true, message: "Kargo bilgisi eklendi, sipariş kargoda." };
}

/** Kargo aracısı (Geliver; hesap yokken mock) ile gönderi + etiket oluşturur ve siparişi kargoya verir. */
export async function createLabelAction(orderId: number): Promise<ActionState & { labelUrl?: string }> {
  const admin = await requireAdmin();
  const db = getDb();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!order) return { ok: false, message: "Sipariş bulunamadı." };
  if (!["paid", "preparing"].includes(order.status)) return { ok: false, message: "Etiket yalnızca ödenmiş/hazırlanan siparişe oluşturulur." };
  let shipment;
  try {
    shipment = await getShippingProvider().createShipment({ orderNo: order.orderNo, recipient: order.shippingAddress, parcel: DEFAULT_PARCEL });
  } catch (e) {
    return { ok: false, message: `Kargo oluşturulamadı: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (order.status === "paid") await transitionOrder(db, orderId, "preparing", `admin:${admin.email}`);
  const r = await transitionOrder(db, orderId, "shipped", `admin:${admin.email}`, `${shipment.carrier} ${shipment.trackingNo}`);
  if (!r.ok) return { ok: false, message: "Durum güncellenemedi." };
  await db.insert(s.shipments).values({
    orderId,
    carrier: shipment.carrier,
    trackingNo: shipment.trackingNo,
    labelUrl: shipment.labelUrl,
    providerRef: shipment.providerRef,
    shippedAt: new Date(),
  });
  await audit(db, admin, "label", "order", order.orderNo, { trackingNo: shipment.trackingNo });
  const sh = shipment;
  after(() => runOrderEffects(db, orderId, "shipped", { carrier: sh.carrier, trackingNo: sh.trackingNo, trackingUrl: sh.trackingUrl }));
  return { ok: true, message: `Etiket hazır: ${shipment.trackingNo}`, labelUrl: shipment.labelUrl };
}

export async function retryInvoiceAction(orderId: number): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  await issueInvoice(db, orderId);
  const [o] = await db
    .select({ invoiceStatus: s.orders.invoiceStatus, invoiceError: s.orders.invoiceError, orderNo: s.orders.orderNo })
    .from(s.orders)
    .where(eq(s.orders.id, orderId));
  await audit(db, admin, "invoice_retry", "order", o?.orderNo ?? orderId);
  return o?.invoiceStatus === "issued" ? { ok: true, message: "Fatura kesildi." } : { ok: false, message: `Fatura kesilemedi: ${o?.invoiceError ?? "bilinmiyor"}` };
}

export async function runExpiryCleanupAction(): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  const r = await runJob(db, "expire-orders");
  const cancelled = (r.summary.cancelled as string[]) ?? [];
  if (cancelled.length) {
    await audit(db, admin, "expire_cleanup", "order", null, { cancelled });
    updateTag(CATALOG_TAG);
  }
  return { ok: true, message: cancelled.length ? `${cancelled.length} sipariş iptal edildi, stok iade edildi.` : "Süresi dolan sipariş yok." };
}

// ── Trendyol ────────────────────────────────────────────────────────────────
export async function runTrendyolSyncAction(): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  const r = await runJob(db, "trendyol");
  await audit(db, admin, "trendyol_sync", "trendyol", null, r.summary);
  if (r.catalogChanged) updateTag(CATALOG_TAG);
  const sm = r.summary as { processed: number; sent: number; failed: number; mode: string };
  const failedText = sm.failed ? `, ${sm.failed} başarısız` : "";
  return { ok: sm.failed === 0, message: `Senkron (${sm.mode}): ${sm.processed} paket işlendi, ${sm.sent} stok gönderildi${failedText}.` };
}

/** Yalnızca mock modda: Trendyol'da satış olmuş gibi paket ekler (senkronu denemek için). */
export async function simulateTrendyolSaleAction(productId: string): Promise<ActionState> {
  await requireAdmin();
  if (integrations.trendyol().mode !== "mock") return { ok: false, message: "Gerçek Trendyol bağlıyken deneme yapılamaz." };
  const [p] = await getDb().select({ barcode: s.products.barcode, name: s.products.name }).from(s.products).where(eq(s.products.id, productId));
  if (!p?.barcode) return { ok: false, message: "Ürünün barkodu yok; önce barkod girin." };
  const n = Date.now();
  trendyolMockState.packages.push({ shipmentPackageId: `MOCK${n}`, orderNumber: `TY${n}`, status: "Created", lastModifiedDate: n, lines: [{ barcode: p.barcode, quantity: 1, productName: p.name }] });
  return { ok: true, message: `Deneme paketi eklendi (${p.name}). Şimdi senkronu çalıştırın.` };
}

// ── Kuponlar ────────────────────────────────────────────────────────────────
export async function saveCouponAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = Number(fd.get("id") || 0);
  const type = String(fd.get("type"));
  const rawValue = String(fd.get("value") ?? "");
  const raw = {
    code: String(fd.get("code") ?? ""),
    label: String(fd.get("label") ?? ""),
    type,
    value: type === "fixed" ? String(parseTRYToKurus(rawValue) ?? "") : rawValue,
    minSubtotalKurus: String(parseTRYToKurus(String(fd.get("minSubtotal") ?? "")) ?? 0),
    startsAt: String(fd.get("startsAt") ?? ""),
    endsAt: String(fd.get("endsAt") ?? ""),
    usageLimit: String(fd.get("usageLimit") ?? ""),
    active: fd.get("active") === "on",
  };
  const p = couponFormSchema.safeParse(raw);
  if (!p.success) return { ok: false, message: "Lütfen işaretli alanları düzeltin.", fieldErrors: zodFieldErrors(p.error) };
  const db = getDb();
  try {
    if (id) {
      await db.update(s.coupons).set(p.data).where(eq(s.coupons.id, id));
    } else {
      await db.insert(s.coupons).values(p.data);
    }
  } catch (e) {
    if (String(e).includes("coupons_code_unique") || String(e).includes("duplicate")) {
      return { ok: false, fieldErrors: { code: "Bu kod zaten var." }, message: "Lütfen işaretli alanları düzeltin." };
    }
    throw e;
  }
  await audit(db, admin, id ? "update" : "create", "coupon", p.data.code, p.data as unknown as Record<string, unknown>);
  redirect("/admin/kuponlar?kaydedildi=1");
}

export async function toggleCouponAction(id: number, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  await db.update(s.coupons).set({ active }).where(eq(s.coupons.id, id));
  await audit(db, admin, active ? "activate" : "deactivate", "coupon", id);
  return { ok: true };
}

// ── Yorumlar ────────────────────────────────────────────────────────────────
export async function moderateReviewAction(id: number, status: "approved" | "rejected"): Promise<ActionState> {
  const admin = await requireAdmin();
  const db = getDb();
  await db.update(s.reviews).set({ status }).where(eq(s.reviews.id, id));
  await audit(db, admin, status, "review", id);
  updateTag(REVIEWS_TAG);
  return { ok: true, message: status === "approved" ? "Yorum yayında." : "Yorum reddedildi." };
}

// ── Ayarlar ─────────────────────────────────────────────────────────────────
export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const kurus = (k: string) => parseTRYToKurus(String(fd.get(k) ?? ""));
  const raw = {
    freeShippingThresholdKurus: kurus("freeShippingThreshold"),
    shippingFeeKurus: kurus("shippingFee"),
    giftWrapPriceKurus: kurus("giftWrapPrice") ?? 0,
    announcement: String(fd.get("announcement") ?? ""),
    paymentMethods: { kart: fd.get("pm_kart") === "on", havale: fd.get("pm_havale") === "on", kapida: fd.get("pm_kapida") === "on" },
    orderHoldMinutes: Number(fd.get("orderHoldMinutes")),
    bank: { bankName: String(fd.get("bankName") ?? ""), accountHolder: String(fd.get("accountHolder") ?? ""), iban: String(fd.get("iban") ?? "") },
    adminNotifyEmail: String(fd.get("adminNotifyEmail") ?? "").trim(),
  };
  const p = storeSettingsSchema.safeParse(raw);
  if (!p.success) {
    const fe = zodFieldErrors(p.error);
    return { ok: false, message: Object.values(fe)[0] ?? "Ayarlar geçersiz.", fieldErrors: fe };
  }
  const db = getDb();
  const [before] = await db.select().from(s.settings).where(eq(s.settings.key, "store"));
  await db
    .insert(s.settings)
    .values({ key: "store", value: p.data })
    .onConflictDoUpdate({ target: s.settings.key, set: { value: p.data } });
  await audit(db, admin, "update", "settings", "store", diffOf((before?.value ?? {}) as Record<string, unknown>, p.data));
  updateTag(SETTINGS_TAG);
  return { ok: true, message: "Ayarlar kaydedildi; sitede hemen geçerli." };
}
