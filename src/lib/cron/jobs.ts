/**
 * Zamanlanmış işler (F3-08). Next.js'ten bağımsız; /api/cron/[job] çağırır, testler doğrudan çağırır.
 * Önerilen sıklık: expire-orders 10 dk · trendyol 5 dk · shipping 60 dk · review-invites günlük.
 */
import { and, eq, isNotNull, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { getShippingProvider } from "@/lib/integrations/shipping";
import { syncLog } from "@/lib/integrations/log";
import { getTrendyolClient } from "@/lib/integrations/trendyol/client";
import { pullTrendyolOrders, pushStockQueue } from "@/lib/integrations/trendyol/sync";
import { notifyBackInStock, runOrderEffects, sendReviewInvites } from "@/lib/orders/effects";
import { cancelExpiredOrders, transitionOrder } from "@/lib/orders/transitions";

export const CRON_JOBS = ["expire-orders", "trendyol", "shipping", "review-invites"] as const;
export type CronJob = (typeof CRON_JOBS)[number];

export type JobResult = { job: CronJob; catalogChanged: boolean; summary: Record<string, unknown> };

export async function runJob(db: Db, job: CronJob, now = new Date()): Promise<JobResult> {
  switch (job) {
    case "expire-orders": {
      const before = await db
        .select({ id: s.orders.id, orderNo: s.orders.orderNo })
        .from(s.orders)
        .where(eq(s.orders.status, "pending_payment"));
      const cancelled = await cancelExpiredOrders(db, now);
      for (const o of before.filter((b) => cancelled.includes(b.orderNo))) await runOrderEffects(db, o.id, "cancelled");
      return { job, catalogChanged: cancelled.length > 0, summary: { cancelled } };
    }
    case "trendyol": {
      const client = getTrendyolClient();
      const pulled = await pullTrendyolOrders(db, client, now);
      const pushed = await pushStockQueue(db, client, now);
      if (pulled.productIds.length) await notifyBackInStock(db, pulled.productIds);
      return { job, catalogChanged: pulled.productIds.length > 0, summary: { mode: client.mode, ...pulled, ...pushed } };
    }
    case "shipping": {
      const provider = getShippingProvider();
      const open = await db
        .select({ orderId: s.shipments.orderId, providerRef: s.shipments.providerRef })
        .from(s.shipments)
        .innerJoin(s.orders, eq(s.shipments.orderId, s.orders.id))
        .where(and(eq(s.orders.status, "shipped"), isNotNull(s.shipments.providerRef)));
      let delivered = 0;
      for (const sh of open) {
        try {
          const st = await provider.getStatus(sh.providerRef!);
          if (st === "delivered") {
            const r = await transitionOrder(db, sh.orderId, "delivered", "kargo");
            if (r.ok) {
              await db.update(s.shipments).set({ status: "delivered", deliveredAt: now }).where(eq(s.shipments.orderId, sh.orderId));
              await runOrderEffects(db, sh.orderId, "delivered");
              delivered++;
            }
          }
        } catch (e) {
          await syncLog(db, "kargo", "warn", `Kargo durumu alınamadı: ${e instanceof Error ? e.message : String(e)}`, sh);
        }
      }
      return { job, catalogChanged: false, summary: { mode: provider.mode, checked: open.length, delivered } };
    }
    case "review-invites": {
      const sent = await sendReviewInvites(db, now);
      return { job, catalogChanged: false, summary: { sent } };
    }
  }
}

export function isCronJob(v: string): v is CronJob {
  return (CRON_JOBS as readonly string[]).includes(v);
}

export { inArray };
