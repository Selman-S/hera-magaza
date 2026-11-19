/**
 * PayTR iFrame API istemcisi. Gerçek mod: https://www.paytr.com/odeme/api/get-token (resmi doküman, Adım 1).
 * Mock mod: dışarıya istek atılmaz; sabit test anahtarlarıyla aynı hash doğrulama yolu kullanılır.
 */
import { integrations } from "@/lib/integrations/config";
import { buildUserBasket, paytrTokenHash, toMerchantOid, type PaytrCredentials } from "./hash";

export const PAYTR_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
export const PAYTR_IFRAME_BASE = "https://www.paytr.com/odeme/guvenli/";

/** Mock modda bildirim imzalamak için kullanılan sabit anahtarlar (gerçek ödeme yapılamaz). */
export const MOCK_PAYTR: PaytrCredentials = { merchantId: "MOCK", merchantKey: "mock-key-hera", merchantSalt: "mock-salt-hera" };

export function paytrCredentials(): PaytrCredentials {
  const c = integrations.paytr();
  return c.mode === "live" ? { merchantId: c.merchantId, merchantKey: c.merchantKey, merchantSalt: c.merchantSalt } : MOCK_PAYTR;
}

export type PaytrOrderInput = {
  orderNo: string;
  email: string;
  totalKurus: number;
  userIp: string;
  userName: string;
  userAddress: string;
  userPhone: string;
  items: Array<{ name: string; unitPriceKurus: number; quantity: number }>;
  okUrl: string;
  failUrl: string;
};

export type PaytrTokenResult =
  | { ok: true; mode: "live"; iframeUrl: string; merchantOid: string }
  | { ok: true; mode: "mock"; merchantOid: string }
  | { ok: false; reason: string };

/** PayTR e-posta alanı Türkçe karakter kabul etmez (resmi doküman). */
function asciiEmail(email: string) {
  return email.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
}

export async function getPaytrToken(input: PaytrOrderInput): Promise<PaytrTokenResult> {
  const cfg = integrations.paytr();
  const merchantOid = toMerchantOid(input.orderNo);
  if (cfg.mode === "mock") return { ok: true, mode: "mock", merchantOid };

  const userBasket = buildUserBasket(input.items);
  const fields = {
    userIp: input.userIp,
    merchantOid,
    email: asciiEmail(input.email),
    paymentAmount: input.totalKurus,
    userBasket,
    noInstallment: 0 as const,
    maxInstallment: cfg.maxInstallment,
    currency: "TL" as const,
    testMode: (cfg.testMode ? 1 : 0) as 0 | 1,
  };
  const body = new URLSearchParams({
    merchant_id: cfg.merchantId,
    user_ip: fields.userIp,
    merchant_oid: merchantOid,
    email: fields.email,
    payment_amount: String(fields.paymentAmount),
    paytr_token: paytrTokenHash(cfg, fields),
    user_basket: userBasket,
    debug_on: cfg.testMode ? "1" : "0",
    no_installment: String(fields.noInstallment),
    max_installment: String(fields.maxInstallment),
    user_name: input.userName.slice(0, 60),
    user_address: input.userAddress.slice(0, 400),
    user_phone: input.userPhone.slice(0, 20),
    merchant_ok_url: input.okUrl,
    merchant_fail_url: input.failUrl,
    timeout_limit: "30",
    currency: "TL",
    test_mode: String(fields.testMode),
    lang: "tr",
  });
  try {
    const res = await fetch(PAYTR_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { status: string; token?: string; reason?: string };
    if (json.status === "success" && json.token) {
      return { ok: true, mode: "live", iframeUrl: PAYTR_IFRAME_BASE + json.token, merchantOid };
    }
    return { ok: false, reason: json.reason ?? `PayTR yanıtı: ${res.status}` };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "PayTR'ye ulaşılamadı" };
  }
}
