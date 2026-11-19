/**
 * PayTR ödeme bildirimi işleme (F3-01). Kurallar (resmi doküman, Adım 2):
 *  - hash doğrulanmadan hiçbir şey değişmez,
 *  - aynı bildirim birden çok gelebilir → merchant_oid ile idempotent,
 *  - sipariş durumu yalnızca buradan değişir (dönüş sayfasından değil).
 * Next.js'ten bağımsız; route handler ve testler bunu çağırır.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { verifyPaytrCallback, type PaytrCredentials } from "@/lib/integrations/paytr/hash";
import { syncLog } from "@/lib/integrations/log";

export type CallbackFields = {
  merchant_oid?: string;
  status?: string;
  total_amount?: string;
  hash?: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  test_mode?: string;
  payment_type?: string;
  payment_amount?: string;
  currency?: string;
};

export type CallbackOutcome =
  | { kind: "bad_hash" }
  | { kind: "unknown_order"; merchantOid: string }
  | { kind: "duplicate"; orderId: number }
  | { kind: "paid"; orderId: number; orderNo: string }
  | { kind: "failed"; orderId: number; orderNo: string }
  | { kind: "late"; orderId: number; orderNo: string; status: string };

export async function processPaytrCallback(db: Db, creds: Pick<PaytrCredentials, "merchantKey" | "merchantSalt">, f: CallbackFields): Promise<CallbackOutcome> {
  const merchantOid = f.merchant_oid ?? "";
  const status = f.status ?? "";
  const totalAmount = f.total_amount ?? "";
  if (!merchantOid || !status || !totalAmount || !verifyPaytrCallback(creds, { merchantOid, status, totalAmount, hash: f.hash ?? "" })) {
    await syncLog(db, "paytr", "warn", "Hash doğrulanamayan ödeme bildirimi reddedildi", { merchantOid });
    return { kind: "bad_hash" };
  }

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(s.orders).where(eq(s.orders.paytrMerchantOid, merchantOid)).for("update");
    if (!order) {
      await syncLog(tx, "paytr", "error", "Bildirim bilinmeyen sipariş için geldi", { merchantOid });
      return { kind: "unknown_order" as const, merchantOid };
    }
    const ref = `${merchantOid}:${status}`;
    const [already] = await tx
      .select({ id: s.payments.id })
      .from(s.payments)
      .where(eq(s.payments.providerRef, ref))
      .limit(1);
    if (already || order.paymentStatus === "paid") return { kind: "duplicate" as const, orderId: order.id };

    const amountKurus = Number(totalAmount);
    await tx.insert(s.payments).values({
      orderId: order.id,
      provider: "paytr",
      providerRef: ref,
      amountKurus: Number.isSafeInteger(amountKurus) ? amountKurus : 0,
      status: status === "success" ? "paid" : "failed",
      rawCallback: { ...f, hash: undefined },
    });

    if (status !== "success") {
      await tx.insert(s.orderEvents).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actor: "paytr",
        note: `Ödeme başarısız: ${f.failed_reason_msg ?? f.failed_reason_code ?? "bilinmiyor"}`,
      });
      return { kind: "failed" as const, orderId: order.id, orderNo: order.orderNo };
    }

    if (order.status !== "pending_payment") {
      // Örn. süre dolup iptal edilmiş siparişe geç gelen başarılı ödeme: elle iade gerekir.
      await syncLog(tx, "paytr", "error", `${order.orderNo}: ödeme alındı ama sipariş "${order.status}" durumunda — elle kontrol/iade gerekli`, {
        totalAmount,
      });
      await tx.insert(s.orderEvents).values({ orderId: order.id, fromStatus: order.status, toStatus: order.status, actor: "paytr", note: "Geç gelen başarılı ödeme — kontrol edin" });
      return { kind: "late" as const, orderId: order.id, orderNo: order.orderNo, status: order.status };
    }
    if (Number(f.payment_amount ?? totalAmount) !== order.totalKurus) {
      await syncLog(tx, "paytr", "warn", `${order.orderNo}: ödenen tutar sipariş tutarından farklı`, { payment_amount: f.payment_amount, total: order.totalKurus });
    }
    await tx.update(s.orders).set({ status: "paid", paymentStatus: "paid", expiresAt: null }).where(eq(s.orders.id, order.id));
    await tx.insert(s.orderEvents).values({ orderId: order.id, fromStatus: "pending_payment", toStatus: "paid", actor: "paytr", note: f.test_mode === "1" ? "Test ödemesi" : null });
    return { kind: "paid" as const, orderId: order.id, orderNo: order.orderNo };
  });
}
