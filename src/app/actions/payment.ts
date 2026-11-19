"use server";

/**
 * Mock ödeme (yalnızca PayTR yapılandırılmamışken ve yayında değilken).
 * Gerçek bildirim yolunu taklit eder: mock anahtarlarla imzalanmış bildirim aynı işleyiciye gider.
 */
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { unsign } from "@/lib/auth/sign";
import { ORDER_COOKIE } from "@/lib/checkout/order";
import { CATALOG_TAG } from "@/lib/data/catalog";
import { mockPaymentsAllowed } from "@/lib/integrations/config";
import { MOCK_PAYTR } from "@/lib/integrations/paytr";
import { paytrCallbackHash } from "@/lib/integrations/paytr/hash";
import { processPaytrCallback } from "@/lib/payments/process";
import { runOrderEffects } from "@/lib/orders/effects";

export async function mockPayAction(orderNo: string, result: "success" | "failed"): Promise<{ ok: boolean; message: string }> {
  if (!mockPaymentsAllowed()) return { ok: false, message: "Mock ödeme kapalı." };
  // Yalnızca siparişi veren tarayıcı
  if (unsign((await cookies()).get(ORDER_COOKIE)?.value, "order-view") !== orderNo) return { ok: false, message: "Yetkisiz." };
  const db = getDb();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.orderNo, orderNo));
  if (!order?.paytrMerchantOid) return { ok: false, message: "Sipariş bulunamadı." };
  const fields = {
    merchant_oid: order.paytrMerchantOid,
    status: result,
    total_amount: String(order.totalKurus),
    payment_amount: String(order.totalKurus),
    payment_type: "card",
    currency: "TL",
    test_mode: "1",
    ...(result === "failed" ? { failed_reason_code: "0", failed_reason_msg: "Test: kart reddedildi" } : {}),
  };
  const hash = paytrCallbackHash(MOCK_PAYTR, { merchantOid: fields.merchant_oid, status: fields.status, totalAmount: fields.total_amount });
  const outcome = await processPaytrCallback(db, MOCK_PAYTR, { ...fields, hash });
  if (outcome.kind === "paid") {
    updateTag(CATALOG_TAG);
    after(() => runOrderEffects(db, outcome.orderId, "paid"));
    return { ok: true, message: "Ödeme alındı (test)." };
  }
  if (outcome.kind === "failed") return { ok: false, message: "Ödeme reddedildi (test). Tekrar deneyebilirsiniz." };
  if (outcome.kind === "duplicate") return { ok: true, message: "Bu sipariş zaten ödenmiş." };
  return { ok: false, message: "Ödeme işlenemedi." };
}
