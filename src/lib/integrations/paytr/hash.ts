/**
 * PayTR iFrame API hash hesapları — resmi doküman:
 *   Adım 1 (token): https://dev.paytr.com/iframe-api/iframe-api-1-adim
 *   Adım 2 (bildirim): https://dev.paytr.com/iframe-api/iframe-api-2-adim
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type PaytrCredentials = { merchantId: string; merchantKey: string; merchantSalt: string };

export type TokenFields = {
  userIp: string;
  merchantOid: string;
  email: string;
  /** Kuruş (tutar × 100) */
  paymentAmount: number;
  /** base64(JSON [[ad, birimFiyat "18.00", adet], ...]) */
  userBasket: string;
  noInstallment: 0 | 1;
  maxInstallment: number;
  currency: "TL";
  testMode: 0 | 1;
};

/**
 * paytr_token = base64(HMAC-SHA256(merchant_key,
 *   merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket
 *   + no_installment + max_installment + currency + test_mode + merchant_salt))
 */
export function paytrTokenHash(c: PaytrCredentials, f: TokenFields): string {
  const hashStr =
    c.merchantId +
    f.userIp +
    f.merchantOid +
    f.email +
    String(f.paymentAmount) +
    f.userBasket +
    String(f.noInstallment) +
    String(f.maxInstallment) +
    f.currency +
    String(f.testMode);
  return createHmac("sha256", c.merchantKey).update(hashStr + c.merchantSalt).digest("base64");
}

/** Bildirim hash'i: base64(HMAC-SHA256(merchant_key, merchant_oid + merchant_salt + status + total_amount)) */
export function paytrCallbackHash(c: Pick<PaytrCredentials, "merchantKey" | "merchantSalt">, p: { merchantOid: string; status: string; totalAmount: string }): string {
  return createHmac("sha256", c.merchantKey)
    .update(p.merchantOid + c.merchantSalt + p.status + p.totalAmount)
    .digest("base64");
}

/** Sabit zamanlı karşılaştırma ile bildirim hash'ini doğrular. */
export function verifyPaytrCallback(
  c: Pick<PaytrCredentials, "merchantKey" | "merchantSalt">,
  p: { merchantOid: string; status: string; totalAmount: string; hash: string },
): boolean {
  const expected = Buffer.from(paytrCallbackHash(c, p));
  const actual = Buffer.from(p.hash ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Birim fiyatı PayTR sepet biçimine çevirir: 119900 → "1199.00" (ondalık aritmetik yok). */
export function kurusToPaytrPrice(kurus: number): string {
  return `${Math.trunc(kurus / 100)}.${String(kurus % 100).padStart(2, "0")}`;
}

export function buildUserBasket(items: Array<{ name: string; unitPriceKurus: number; quantity: number }>): string {
  const rows = items.map((i) => [i.name, kurusToPaytrPrice(i.unitPriceKurus), i.quantity]);
  return Buffer.from(JSON.stringify(rows), "utf8").toString("base64");
}

/** merchant_oid yalnızca harf ve rakam olabilir (en çok 64): "HR-2026-00001" → "HR202600001" */
export function toMerchantOid(orderNo: string): string {
  return orderNo.replace(/[^A-Za-z0-9]/g, "").slice(0, 64);
}
