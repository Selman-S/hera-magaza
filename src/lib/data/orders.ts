/** Müşteriye gösterilen sipariş bilgisi (önbelleksiz; erişim imzalı çerezle sınırlı). */
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";

export async function getOrderForCustomer(orderNo: string) {
  const db = getDb();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.orderNo, orderNo)).limit(1);
  if (!order) return null;
  const [items, shipments, events] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id)).orderBy(asc(s.orderItems.id)),
    db.select().from(s.shipments).where(eq(s.shipments.orderId, order.id)).orderBy(desc(s.shipments.createdAt)),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, order.id)).orderBy(asc(s.orderEvents.createdAt)),
  ]);
  return { order, items, shipments, events };
}
