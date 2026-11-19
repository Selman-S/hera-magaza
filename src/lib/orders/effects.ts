/**
 * Sipariş olaylarının yan etkileri: e-posta, fatura, Meta CAPI, Trendyol stok kuyruğu, "gelince haber ver".
 * Veritabanı işlemi (transaction) bittikten SONRA çağrılır; hatalar siparişi geri almaz, günlüğe yazılır.
 * Next.js'ten bağımsız (önbellek yenileme çağıranın işi).
 */
import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { createElement } from "react";
import type { Db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { sign } from "@/lib/auth/sign";
import { readStoreSettings } from "@/lib/data/cart";
import { sendEmail } from "@/lib/integrations/email";
import * as T from "@/lib/integrations/email/templates";
import { getInvoiceProvider } from "@/lib/integrations/invoice";
import { syncLog } from "@/lib/integrations/log";
import { sendMetaPurchase } from "@/lib/integrations/meta/capi";
import { enqueueStockSync } from "@/lib/integrations/trendyol/sync";
import { siteUrl } from "@/lib/site-url";

export type OrderEvent = "created" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded" | "returned";

const PAYMENT_LABEL = { kart: "Kart", havale: "Havale/EFT", kapida: "Kapıda ödeme" } as const;

async function loadEmailOrder(db: Db, orderId: number) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!order) return null;
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId)).orderBy(asc(s.orderItems.id));
  const view: T.EmailOrder = {
    orderNo: order.orderNo,
    customerName: order.shippingAddress.fullName.split(" ")[0] ?? "",
    totalKurus: order.totalKurus,
    shippingKurus: order.shippingKurus,
    discountKurus: order.discountKurus,
    items: items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity, priceKurus: i.priceKurusSnapshot, giftWrap: i.giftWrap })),
    // Müşteri bağlantıdan sipariş sorgulama ile (e-posta doğrulayarak) açar.
    orderUrl: `${siteUrl()}/siparis-sorgula?no=${encodeURIComponent(order.orderNo)}`,
  };
  return { order, items, view };
}

export async function issueInvoice(db: Db, orderId: number) {
  const data = await loadEmailOrder(db, orderId);
  if (!data) return;
  const { order, items } = data;
  if (order.invoiceStatus === "issued") return;
  await db.update(s.orders).set({ invoiceStatus: "pending", invoiceError: null }).where(eq(s.orders.id, orderId));
  try {
    const inv = await getInvoiceProvider().issue({
      orderNo: order.orderNo,
      issuedAt: new Date(),
      billing: order.billingAddress,
      email: order.email,
      lines: items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity, unitPriceKurus: i.priceKurusSnapshot })),
      shippingKurus: order.shippingKurus,
      discountKurus: order.discountKurus,
      totalKurus: order.totalKurus,
    });
    await db.update(s.orders).set({ invoiceStatus: "issued", invoiceNo: inv.invoiceNo, invoiceUrl: inv.url }).where(eq(s.orders.id, orderId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.update(s.orders).set({ invoiceStatus: "failed", invoiceError: msg }).where(eq(s.orders.id, orderId));
    await syncLog(db, "fatura", "error", `${order.orderNo}: fatura kesilemedi — ${msg}`);
  }
}

/** Olayın yan etkilerini çalıştırır. Asla hata fırlatmaz. */
export async function runOrderEffects(db: Db, orderId: number, event: OrderEvent, extra: { carrier?: string; trackingNo?: string; trackingUrl?: string } = {}) {
  try {
    const data = await loadEmailOrder(db, orderId);
    if (!data) return;
    const { order, items, view } = data;
    const settings = await readStoreSettings(db);
    const productIds = items.flatMap((i) => (i.productId ? [i.productId] : []));
    const adminUrl = `${siteUrl()}/admin/siparisler/${order.orderNo}`;

    switch (event) {
      case "created":
        await enqueueStockSync(db, productIds);
        if (order.paymentMethod === "havale") {
          await sendEmail(db, { to: order.email, subject: `Siparişiniz alındı · ${order.orderNo}`, template: "havale", orderId, react: createElement(T.HavaleInstructions, { order: view, bank: settings.bank }) });
          if (settings.adminNotifyEmail) {
            await sendEmail(db, { to: settings.adminNotifyEmail, subject: `Yeni sipariş (havale bekleniyor) · ${order.orderNo}`, template: "admin-yeni", orderId, react: createElement(T.AdminNewOrder, { order: view, paymentLabel: "Havale/EFT — ödeme bekleniyor", adminUrl }) });
          }
        }
        break;
      case "paid":
        await sendEmail(db, { to: order.email, subject: `Ödemeniz alındı · ${order.orderNo}`, template: "odeme-alindi", orderId, react: createElement(T.PaymentReceived, { order: view }) });
        if (settings.adminNotifyEmail) {
          await sendEmail(db, { to: settings.adminNotifyEmail, subject: `Yeni ödenmiş sipariş · ${order.orderNo}`, template: "admin-yeni", orderId, react: createElement(T.AdminNewOrder, { order: view, paymentLabel: `${PAYMENT_LABEL[order.paymentMethod]} — ödendi`, adminUrl }) });
        }
        await issueInvoice(db, orderId);
        await sendMetaPurchase({ orderNo: order.orderNo, email: order.email, phone: order.phone, totalKurus: order.totalKurus, eventSourceUrl: `${siteUrl()}/odeme`, at: new Date() }).catch((e) =>
          syncLog(db, "meta", "warn", `Meta CAPI gönderilemedi: ${String(e)}`),
        );
        break;
      case "shipped":
        if (extra.trackingNo) {
          await sendEmail(db, {
            to: order.email,
            subject: `Siparişiniz kargoda · ${order.orderNo}`,
            template: "kargoda",
            orderId,
            react: createElement(T.Shipped, { order: view, carrier: extra.carrier ?? "Kargo", trackingNo: extra.trackingNo, trackingUrl: extra.trackingUrl }),
          });
        }
        break;
      case "delivered":
        await db.update(s.orders).set({ deliveredAt: new Date() }).where(eq(s.orders.id, orderId));
        break;
      case "cancelled":
      case "refunded":
      case "returned":
        await enqueueStockSync(db, productIds);
        await notifyBackInStock(db, productIds);
        if (event === "cancelled") {
          const reason = order.paymentStatus === "failed" ? "Ödeme süresi içinde tamamlanmadığı için ürün yeniden satışa açıldı." : "";
          await sendEmail(db, { to: order.email, subject: `Siparişiniz iptal edildi · ${order.orderNo}`, template: "iptal", orderId, react: createElement(T.OrderCancelled, { order: view, reason }) });
        }
        break;
    }
  } catch (e) {
    await syncLog(db, "cron", "error", `Sipariş yan etkisi başarısız (${event}, #${orderId}): ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Stoğa dönen ürünler için "gelince haber ver" e-postaları (her istek bir kez). */
export async function notifyBackInStock(db: Db, productIds: string[]) {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return 0;
  const inStock = await db
    .select({ id: s.products.id, name: s.products.name, slug: s.products.slug })
    .from(s.products)
    .where(and(inArray(s.products.id, ids), gt(s.products.stock, 0), eq(s.products.status, "active")));
  let sent = 0;
  for (const p of inStock) {
    const requests = await db
      .select()
      .from(s.backInStockRequests)
      .where(and(eq(s.backInStockRequests.productId, p.id), isNull(s.backInStockRequests.notifiedAt)));
    for (const r of requests) {
      await sendEmail(db, { to: r.email, subject: `${p.name} yeniden satışta`, template: "gelince-haber-ver", react: createElement(T.BackInStock, { productName: p.name, productUrl: `${siteUrl()}/urun/${p.slug}` }) });
      await db.update(s.backInStockRequests).set({ notifiedAt: new Date() }).where(eq(s.backInStockRequests.id, r.id));
      sent++;
    }
  }
  return sent;
}

/** Teslimattan N gün sonra yorum daveti (cron). */
export async function sendReviewInvites(db: Db, now = new Date(), afterDays = 5) {
  const cutoff = new Date(now.getTime() - afterDays * 86_400_000);
  const due = await db
    .select({ id: s.orders.id, deliveredAt: s.orders.deliveredAt })
    .from(s.orders)
    .where(and(eq(s.orders.status, "delivered"), isNull(s.orders.reviewInviteSentAt)));
  let sent = 0;
  for (const o of due) {
    if (!o.deliveredAt || o.deliveredAt > cutoff) continue;
    const data = await loadEmailOrder(db, o.id);
    if (!data) continue;
    const reviewUrl = `${siteUrl()}/yorum?anahtar=${encodeURIComponent(sign(data.order.orderNo, "review"))}`;
    const r = await sendEmail(db, { to: data.order.email, subject: "Şalınızı nasıl buldunuz?", template: "yorum-daveti", orderId: o.id, react: createElement(T.ReviewInvite, { order: data.view, reviewUrl }) });
    if (r.ok) {
      await db.update(s.orders).set({ reviewInviteSentAt: now }).where(eq(s.orders.id, o.id));
      sent++;
    }
  }
  return sent;
}
