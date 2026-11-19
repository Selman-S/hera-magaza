/**
 * Sipariş oluşturma (F2-05). Tek transaction:
 *   ürün satırlarını kilitle (SELECT … FOR UPDATE) → stok kontrolü → stok düş → inventory_movements
 *   → müşteri → sipariş + kalemler (pending_payment) → kupon kullanım sayısı → onay kayıtları.
 * Aynı tek stoklu ürüne eşzamanlı iki sipariş gelirse ikincisi kilidi bekler, stoğu 0 görür ve reddedilir.
 * Next.js'e bağımlı değildir (entegrasyon testlerinde doğrudan çağrılır).
 */
import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { checkoutSchema, fieldErrors, type CheckoutInput } from "@/lib/checkout/schema";
import { normalizeTRMobile } from "@/lib/validators";
import { priceCart, type CartInput, type CartIssue } from "@/lib/data/cart";
import { formatOrderNo } from "./status";

/** Onay metinlerinin sürümü; metin değişince artırılır (consent_logs.text_version). */
export const CONSENT_TEXT_VERSION = "2026-11-taslak-1";

export type CreateOrderInput = {
  checkout: CheckoutInput;
  cart: CartInput;
  marketingConsent: boolean;
};

export type CreateOrderContext = { now?: Date; ip?: string | null; userAgent?: string | null };

export type CreateOrderResult =
  | { ok: true; orderNo: string; orderId: number; totalKurus: number; productIds: string[] }
  | { ok: false; code: "invalid"; fieldErrors: Record<string, string> }
  | { ok: false; code: "empty" }
  | { ok: false; code: "stock"; issues: CartIssue[] }
  | { ok: false; code: "coupon"; message: string };

class Abort extends Error {
  constructor(readonly result: Exclude<CreateOrderResult, { ok: true }>) {
    super(result.code);
  }
}

export async function createOrder(db: Db, input: CreateOrderInput, ctx: CreateOrderContext = {}): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(input.checkout);
  if (!parsed.success) return { ok: false, code: "invalid", fieldErrors: fieldErrors(parsed.error) };
  const form = parsed.data;
  const now = ctx.now ?? new Date();
  const email = form.email.toLowerCase();
  const phone = normalizeTRMobile(form.phone)!;

  try {
    return await db.transaction(async (tx) => {
      const priced = await priceCart(tx, input.cart, { now, lock: true });
      if (priced.lines.length === 0 && priced.issues.length === 0) throw new Abort({ ok: false, code: "empty" });
      // Stok/aktiflik sorunu varsa müşteri sepeti görmeden sipariş açılmaz.
      const blocking = priced.issues.filter((i) => i.type !== "price_changed");
      if (blocking.length > 0) throw new Abort({ ok: false, code: "stock", issues: blocking });
      if (input.cart.couponCode && priced.couponError) {
        throw new Abort({ ok: false, code: "coupon", message: priced.couponError });
      }
      if (!priced.settings.paymentMethods[form.paymentMethod]) {
        throw new Abort({ ok: false, code: "invalid", fieldErrors: { paymentMethod: "Bu ödeme yöntemi şu an kullanılamıyor." } });
      }

      // Stok düş. CHECK (stock >= 0) son savunma hattıdır.
      for (const l of priced.lines) {
        await tx
          .update(s.products)
          .set({ stock: sql`${s.products.stock} - ${l.quantity}` })
          .where(eq(s.products.id, l.productId));
      }

      const fullName = `${form.shipping.firstName} ${form.shipping.lastName}`.trim();
      const [customer] = await tx
        .insert(s.customers)
        .values({ email, phone, name: fullName, marketingConsent: input.marketingConsent })
        .onConflictDoUpdate({
          target: s.customers.email,
          set: {
            phone,
            name: fullName,
            ...(input.marketingConsent ? { marketingConsent: true } : {}),
          },
        })
        .returning({ id: s.customers.id });

      const shippingAddress: s.AddressSnapshot = {
        fullName,
        phone,
        city: form.shipping.il,
        district: form.shipping.ilce,
        line: form.shipping.address,
        postalCode: form.shipping.postalCode || undefined,
      };
      const billingBase = form.billingSameAsShipping || !form.billingAddress
        ? shippingAddress
        : {
            fullName: `${form.billingAddress.firstName} ${form.billingAddress.lastName}`.trim(),
            phone,
            city: form.billingAddress.il,
            district: form.billingAddress.ilce,
            line: form.billingAddress.address,
            postalCode: form.billingAddress.postalCode || undefined,
          };
      const billingAddress: s.BillingSnapshot =
        form.billingType === "kurumsal"
          ? { ...billingBase, type: "kurumsal", companyName: form.companyName, taxOffice: form.taxOffice, vkn: form.vkn }
          : { ...billingBase, type: "bireysel", tckn: form.tckn || undefined };

      const [{ seq }] = await tx.execute<{ seq: string }>(sql`SELECT nextval('order_no_seq')::text AS seq`);
      const orderNo = formatOrderNo(now.getFullYear(), Number(seq));
      const t = priced.totals;

      const [order] = await tx
        .insert(s.orders)
        .values({
          orderNo,
          customerId: customer.id,
          status: "pending_payment",
          paymentMethod: form.paymentMethod,
          paymentStatus: "pending",
          email,
          phone,
          subtotalKurus: t.subtotalKurus,
          discountKurus: t.discountKurus,
          giftWrapKurus: t.giftWrapKurus,
          shippingKurus: t.shippingKurus,
          totalKurus: t.totalKurus,
          couponCode: priced.coupon?.code ?? null,
          shippingAddress,
          billingAddress,
          customerNote: form.orderNote || null,
          expiresAt: new Date(now.getTime() + priced.settings.orderHoldMinutes * 60_000),
          createdAt: now,
        })
        .returning({ id: s.orders.id });

      await tx.insert(s.orderItems).values(
        priced.lines.map((l) => ({
          orderId: order.id,
          productId: l.productId,
          nameSnapshot: l.name,
          slugSnapshot: l.slug,
          imageSnapshot: l.image.src || null,
          priceKurusSnapshot: l.priceKurus,
          quantity: l.quantity,
          giftWrap: l.giftWrap,
          giftNote: l.giftNote || null,
        })),
      );
      await tx.insert(s.inventoryMovements).values(
        priced.lines.map((l) => ({ productId: l.productId, delta: -l.quantity, reason: "order" as const, refId: orderNo, actor: "musteri" })),
      );
      await tx.insert(s.orderEvents).values({ orderId: order.id, fromStatus: null, toStatus: "pending_payment", actor: "musteri", note: "Sipariş oluşturuldu" });

      if (priced.coupon) {
        await tx
          .update(s.coupons)
          .set({ usedCount: sql`${s.coupons.usedCount} + 1` })
          .where(eq(s.coupons.code, priced.coupon.code));
      }

      const consentBase = { customerId: customer.id, email, orderId: order.id, textVersion: CONSENT_TEXT_VERSION, ip: ctx.ip ?? null, userAgent: ctx.userAgent ?? null };
      await tx.insert(s.consentLogs).values([
        { ...consentBase, type: "pre_info", granted: true },
        { ...consentBase, type: "distance_sales", granted: true },
        // KVKK aydınlatma metni gösterildi (aydınlatma bir onay değil, bilgilendirmedir; kaydı tutulur).
        { ...consentBase, type: "kvkk", granted: true },
        { ...consentBase, type: "etk", granted: input.marketingConsent },
      ]);
      if (input.marketingConsent) {
        await tx
          .insert(s.newsletterSubscribers)
          .values({ email, source: "checkout", consentAt: now })
          .onConflictDoUpdate({ target: s.newsletterSubscribers.email, set: { unsubscribedAt: null } });
      }

      return { ok: true as const, orderNo, orderId: order.id, totalKurus: t.totalKurus, productIds: priced.lines.map((l) => l.productId) };
    });
  } catch (e) {
    if (e instanceof Abort) return e.result;
    // Son savunma: CHECK (stock >= 0) ihlali → stok yetersiz.
    if (e instanceof Error && /products_stock_nonnegative/.test(`${e.message} ${String((e as { cause?: unknown }).cause ?? "")}`)) {
      return { ok: false, code: "stock", issues: [] };
    }
    throw e;
  }
}
