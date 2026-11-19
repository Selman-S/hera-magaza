"use server";

/**
 * Vitrin sunucu eylemleri. İstemciden gelen her şey yeniden doğrulanır; fiyat/stok veritabanından okunur.
 */
import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { sign } from "@/lib/auth/sign";
import { priceCart, type CartInput, type PricedCart } from "@/lib/data/cart";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { createOrder, type CreateOrderResult } from "@/lib/orders/create";
import type { CheckoutInput } from "@/lib/checkout/schema";
import { rateLimit } from "@/lib/rate-limit";
import { ORDER_COOKIE } from "@/lib/checkout/order";

async function clientInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/** Sepeti sunucuda fiyatlandırır; istemci sepeti bu sonuca göre günceller. */
export async function validateCart(input: CartInput, clientPrices?: Record<string, number>): Promise<PricedCart> {
  return priceCart(getDb(), input, { clientPrices });
}

export type PlaceOrderResult = CreateOrderResult | { ok: false; code: "rate_limited" };

export async function placeOrder(input: {
  checkout: CheckoutInput;
  cart: CartInput;
  marketingConsent: boolean;
}): Promise<PlaceOrderResult> {
  const info = await clientInfo();
  if (!rateLimit(`order:${info.ip ?? "?"}`, { limit: 10, windowMs: 10 * 60_000 })) {
    return { ok: false, code: "rate_limited" };
  }
  const result = await createOrder(getDb(), input, info);
  if (result.ok) {
    // Stok değişti: vitrin önbelleğini hemen yenile.
    updateTag(CATALOG_TAG);
    (await cookies()).set(ORDER_COOKIE, sign(result.orderNo, "order-view"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return result;
}

const emailSchema = z.email("Geçerli bir e-posta adresi yazın.").transform((e) => e.trim().toLowerCase());

export type SimpleResult = { ok: true } | { ok: false; message: string };

export async function subscribeNewsletter(rawEmail: string, consent: boolean, source = "site"): Promise<SimpleResult> {
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { ok: false, message: email.error.issues[0]?.message ?? "Geçersiz e-posta" };
  if (!consent) return { ok: false, message: "Devam etmek için ticari ileti onayı gerekli." };
  const info = await clientInfo();
  if (!rateLimit(`newsletter:${info.ip ?? "?"}`, { limit: 5, windowMs: 10 * 60_000 })) {
    return { ok: false, message: "Çok fazla deneme. Biraz sonra tekrar deneyin." };
  }
  const db = getDb();
  await db
    .insert(s.newsletterSubscribers)
    .values({ email: email.data, source })
    .onConflictDoUpdate({ target: s.newsletterSubscribers.email, set: { unsubscribedAt: null, consentAt: sql`now()` } });
  await db.insert(s.consentLogs).values({
    email: email.data,
    type: "etk",
    granted: true,
    textVersion: "2026-11-taslak-1",
    ip: info.ip,
    userAgent: info.userAgent,
  });
  // Faz 3: çift onay (double opt-in) e-postası gönderilecek.
  return { ok: true };
}

export async function requestBackInStock(productId: string, rawEmail: string): Promise<SimpleResult> {
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { ok: false, message: email.error.issues[0]?.message ?? "Geçersiz e-posta" };
  const info = await clientInfo();
  if (!rateLimit(`stock:${info.ip ?? "?"}`, { limit: 10, windowMs: 10 * 60_000 })) {
    return { ok: false, message: "Çok fazla deneme. Biraz sonra tekrar deneyin." };
  }
  const db = getDb();
  const [p] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.id, productId)).limit(1);
  if (!p) return { ok: false, message: "Ürün bulunamadı." };
  await db
    .insert(s.backInStockRequests)
    .values({ productId, email: email.data })
    .onConflictDoUpdate({
      target: [s.backInStockRequests.productId, s.backInStockRequests.email],
      set: { notifiedAt: null },
    });
  return { ok: true };
}

/** Sipariş sorgulama: sipariş no + e-posta eşleşirse sipariş sayfasını açacak çerezi verir. */
export async function lookupOrder(rawOrderNo: string, rawEmail: string): Promise<SimpleResult & { orderNo?: string }> {
  const info = await clientInfo();
  if (!rateLimit(`lookup:${info.ip ?? "?"}`, { limit: 10, windowMs: 15 * 60_000 })) {
    return { ok: false, message: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." };
  }
  const orderNo = rawOrderNo.trim().toUpperCase();
  const email = rawEmail.trim().toLowerCase();
  const [o] = await getDb()
    .select({ orderNo: s.orders.orderNo })
    .from(s.orders)
    .where(and(eq(s.orders.orderNo, orderNo), eq(s.orders.email, email)))
    .limit(1);
  // Hangi bilginin yanlış olduğu söylenmez (sipariş numarası taraması zorlaşsın).
  if (!o) return { ok: false, message: "Bu sipariş numarası ve e-posta ile eşleşen sipariş bulunamadı." };
  (await cookies()).set(ORDER_COOKIE, sign(o.orderNo, "order-view"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return { ok: true, orderNo: o.orderNo };
}
