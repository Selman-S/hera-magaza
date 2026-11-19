"use server";

import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { unsign } from "@/lib/auth/sign";
import { ORDER_COOKIE } from "@/lib/checkout/order";

/**
 * "purchase" olayını sipariş başına BİR kez gönderme hakkı verir: yalnızca ödenmiş ve daha önce
 * işaretlenmemiş siparişte true döner (atomik güncelleme). Sayfa yenilense de ikinci kez gönderilmez.
 */
export async function claimPurchaseEvent(orderNo: string): Promise<boolean> {
  if (unsign((await cookies()).get(ORDER_COOKIE)?.value, "order-view") !== orderNo) return false;
  const rows = await getDb()
    .update(s.orders)
    .set({ purchaseTrackedAt: new Date() })
    .where(and(eq(s.orders.orderNo, orderNo), eq(s.orders.paymentStatus, "paid"), isNull(s.orders.purchaseTrackedAt)))
    .returning({ id: s.orders.id });
  return rows.length === 1;
}
