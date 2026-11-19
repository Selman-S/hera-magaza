/** Yönetim paneli okuma sorguları (önbelleksiz, her istekte güncel). */
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, notInArray, or, sql, sum } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import type { OrderStatus } from "@/lib/orders/status";

// ── Siparişler ──────────────────────────────────────────────────────────────
export async function listOrders(db: Db, opts: { status?: OrderStatus; q?: string; from?: Date; to?: Date; limit?: number }) {
  const conds = [];
  if (opts.status) conds.push(eq(s.orders.status, opts.status));
  if (opts.q) {
    const like = `%${opts.q.trim()}%`;
    conds.push(
      or(
        ilike(s.orders.orderNo, like),
        ilike(s.orders.email, like),
        ilike(s.orders.phone, like),
        sql`${s.orders.shippingAddress}->>'fullName' ILIKE ${like}`,
      ),
    );
  }
  if (opts.from) conds.push(gte(s.orders.createdAt, opts.from));
  if (opts.to) conds.push(lte(s.orders.createdAt, opts.to));
  return db
    .select({
      id: s.orders.id,
      orderNo: s.orders.orderNo,
      status: s.orders.status,
      paymentMethod: s.orders.paymentMethod,
      totalKurus: s.orders.totalKurus,
      email: s.orders.email,
      fullName: sql<string>`${s.orders.shippingAddress}->>'fullName'`,
      city: sql<string>`${s.orders.shippingAddress}->>'city'`,
      itemCount: sql<number>`(SELECT coalesce(sum(oi.quantity),0)::int FROM order_items oi WHERE oi.order_id = "orders"."id")`,
      createdAt: s.orders.createdAt,
    })
    .from(s.orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.orders.createdAt))
    .limit(opts.limit ?? 200);
}

export async function getOrderForAdmin(db: Db, orderNo: string) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.orderNo, orderNo)).limit(1);
  if (!order) return null;
  const [items, events, shipments, payments] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id)).orderBy(asc(s.orderItems.id)),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, order.id)).orderBy(desc(s.orderEvents.createdAt)),
    db.select().from(s.shipments).where(eq(s.shipments.orderId, order.id)).orderBy(desc(s.shipments.createdAt)),
    db.select().from(s.payments).where(eq(s.payments.orderId, order.id)).orderBy(desc(s.payments.createdAt)),
  ]);
  return { order, items, events, shipments, payments };
}

// ── Gösterge paneli ─────────────────────────────────────────────────────────
/** Ciroya sayılmayan durumlar: ödenmemiş, iptal ve iade. */
const NOT_REVENUE: OrderStatus[] = ["pending_payment", "cancelled", "refunded", "returned"];

export async function dashboardStats(db: Db, now = new Date()) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // Pazartesi
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

  const period = async (from: Date) => {
    const [r] = await db
      .select({ orders: count(), revenue: sum(s.orders.totalKurus) })
      .from(s.orders)
      .where(and(gte(s.orders.createdAt, from), notInArray(s.orders.status, NOT_REVENUE)));
    const orders = Number(r?.orders ?? 0);
    const revenue = Number(r?.revenue ?? 0);
    return { orders, revenueKurus: revenue, avgBasketKurus: orders ? Math.round(revenue / orders) : 0 };
  };

  const [today, week, month, pending, lowStock, toShip] = await Promise.all([
    period(startOfDay),
    period(startOfWeek),
    period(startOfMonth),
    db
      .select({ orderNo: s.orders.orderNo, totalKurus: s.orders.totalKurus, createdAt: s.orders.createdAt, expiresAt: s.orders.expiresAt, email: s.orders.email })
      .from(s.orders)
      .where(eq(s.orders.status, "pending_payment"))
      .orderBy(desc(s.orders.createdAt))
      .limit(10),
    db
      .select({ id: s.products.id, name: s.products.name, stock: s.products.stock })
      .from(s.products)
      .where(and(eq(s.products.status, "active"), lte(s.products.stock, 1)))
      .orderBy(asc(s.products.stock), asc(s.products.name)),
    db
      .select({ orderNo: s.orders.orderNo, status: s.orders.status, createdAt: s.orders.createdAt, fullName: sql<string>`${s.orders.shippingAddress}->>'fullName'` })
      .from(s.orders)
      .where(inArray(s.orders.status, ["paid", "preparing"]))
      .orderBy(asc(s.orders.createdAt))
      .limit(10),
  ]);
  return { today, week, month, pending, lowStock, toShip };
}

// ── Kuponlar ────────────────────────────────────────────────────────────────
export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Kod en az 3 karakter.")
      .max(30)
      .transform((c) => c.toLocaleUpperCase("en-US"))
      .refine((c) => /^[A-Z0-9_-]+$/.test(c), "Kod yalnızca harf (Türkçe karaktersiz), rakam, - ve _ içerebilir."),
    label: z.string().trim().min(2, "Açıklama gerekli.").max(80),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().int().positive("Değer sıfırdan büyük olmalı."),
    minSubtotalKurus: z.coerce.number().int().min(0),
    startsAt: z.string().transform((v) => (v ? new Date(`${v}T00:00:00+03:00`) : null)),
    endsAt: z.string().transform((v) => (v ? new Date(`${v}T23:59:59+03:00`) : null)),
    usageLimit: z.string().transform((v) => (v ? Number(v) : null)),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "percent" && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Yüzde en fazla 100." });
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Bitiş başlangıçtan önce olamaz." });
    if (v.usageLimit !== null && (!Number.isInteger(v.usageLimit) || v.usageLimit < 1)) {
      ctx.addIssue({ code: "custom", path: ["usageLimit"], message: "Kullanım limiti pozitif tam sayı olmalı." });
    }
  });

export function listCoupons(db: Db) {
  return db.select().from(s.coupons).orderBy(desc(s.coupons.createdAt));
}

// ── Yorumlar ────────────────────────────────────────────────────────────────
export function listReviews(db: Db, status?: "pending" | "approved" | "rejected") {
  return db
    .select({
      id: s.reviews.id,
      name: s.reviews.name,
      city: s.reviews.city,
      rating: s.reviews.rating,
      text: s.reviews.text,
      status: s.reviews.status,
      createdAt: s.reviews.createdAt,
      productName: s.products.name,
      productSlug: s.products.slug,
      orderNo: s.orders.orderNo,
    })
    .from(s.reviews)
    .innerJoin(s.products, eq(s.reviews.productId, s.products.id))
    .leftJoin(s.orders, eq(s.reviews.orderId, s.orders.id))
    .where(status ? eq(s.reviews.status, status) : undefined)
    .orderBy(desc(s.reviews.createdAt));
}

export async function pendingCounts(db: Db) {
  const [[orders], [reviews]] = await Promise.all([
    db.select({ n: count() }).from(s.orders).where(inArray(s.orders.status, ["paid", "preparing"])),
    db.select({ n: count() }).from(s.reviews).where(eq(s.reviews.status, "pending")),
  ]);
  return { ordersToShip: Number(orders?.n ?? 0), reviewsPending: Number(reviews?.n ?? 0) };
}
