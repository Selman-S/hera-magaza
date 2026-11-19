/**
 * Sipariş durum değişikliği, iptal ve süresi dolan siparişlerin temizlenmesi.
 * Stok iadesi aynı transaction'da yapılır.
 */
import { and, eq, lt, sql } from "drizzle-orm";
import type { Db, Tx } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { canTransition, restocksOn, type OrderStatus } from "./status";

export type TransitionResult =
  | { ok: true; orderNo: string; productIds: string[] }
  | { ok: false; reason: "not_found" | "invalid_transition"; from?: OrderStatus };

async function transitionInTx(
  tx: Tx,
  orderId: number,
  to: OrderStatus,
  actor: string,
  note?: string,
): Promise<TransitionResult> {
  const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for("update");
  if (!order) return { ok: false, reason: "not_found" };
  if (!canTransition(order.status, to)) return { ok: false, reason: "invalid_transition", from: order.status };

  const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  const productIds = items.flatMap((i) => (i.productId ? [i.productId] : []));

  if (restocksOn(order.status, to)) {
    for (const i of items) {
      if (!i.productId) continue;
      await tx.update(s.products).set({ stock: sql`${s.products.stock} + ${i.quantity}` }).where(eq(s.products.id, i.productId));
      await tx.insert(s.inventoryMovements).values({
        productId: i.productId,
        delta: i.quantity,
        reason: to === "returned" ? "return" : "cancel",
        refId: order.orderNo,
        actor,
      });
    }
  }

  const paymentStatus =
    to === "paid" ? "paid" : to === "refunded" ? "refunded" : to === "cancelled" && order.paymentStatus === "pending" ? "failed" : undefined;
  await tx
    .update(s.orders)
    .set({ status: to, ...(paymentStatus ? { paymentStatus } : {}), ...(to !== "pending_payment" ? { expiresAt: null } : {}) })
    .where(eq(s.orders.id, orderId));
  await tx.insert(s.orderEvents).values({ orderId, fromStatus: order.status, toStatus: to, actor, note: note ?? null });
  return { ok: true, orderNo: order.orderNo, productIds };
}

export function transitionOrder(db: Db, orderId: number, to: OrderStatus, actor: string, note?: string) {
  return db.transaction((tx) => transitionInTx(tx, orderId, to, actor, note));
}

/**
 * Ödemesi süresinde yapılmayan siparişleri iptal eder ve stoğu iade eder.
 * Faz 3'te cron ile (ör. 5 dakikada bir) çağrılacak. SKIP LOCKED: aynı anda çalışan iki temizlik çakışmaz.
 */
export async function cancelExpiredOrders(db: Db, now: Date = new Date()): Promise<string[]> {
  const cancelled: string[] = [];
  const expired = await db
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(and(eq(s.orders.status, "pending_payment"), lt(s.orders.expiresAt, now)));
  for (const { id } of expired) {
    const r = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: s.orders.id, status: s.orders.status, expiresAt: s.orders.expiresAt })
        .from(s.orders)
        .where(eq(s.orders.id, id))
        .for("update", { skipLocked: true });
      if (!locked || locked.status !== "pending_payment" || !locked.expiresAt || locked.expiresAt >= now) return null;
      return transitionInTx(tx, id, "cancelled", "sistem", "Ödeme süresi doldu");
    });
    if (r?.ok) cancelled.push(r.orderNo);
  }
  return cancelled;
}
