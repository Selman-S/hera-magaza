/**
 * Entegrasyon yapılandırması (yalnızca sunucu). Bir servisin ortam değişkenleri eksikse o servis
 * "mock" modunda çalışır: dışarıya istek atılmaz, sonuçlar veritabanına/günlüğe yazılır.
 * docs/kararlar.md → K-05.
 */
const env = (k: string) => process.env[k]?.trim() || undefined;

export const integrations = {
  paytr() {
    const merchantId = env("PAYTR_MERCHANT_ID");
    const merchantKey = env("PAYTR_MERCHANT_KEY");
    const merchantSalt = env("PAYTR_MERCHANT_SALT");
    if (merchantId && merchantKey && merchantSalt) {
      return {
        mode: "live" as const,
        merchantId,
        merchantKey,
        merchantSalt,
        testMode: env("PAYTR_TEST_MODE") !== "0", // varsayılan: test modu açık
        maxInstallment: Number(env("PAYTR_MAX_INSTALLMENT") ?? "0"),
      };
    }
    return { mode: "mock" as const };
  },
  trendyol() {
    const sellerId = env("TRENDYOL_SELLER_ID");
    const apiKey = env("TRENDYOL_API_KEY");
    const apiSecret = env("TRENDYOL_API_SECRET");
    const storeFrontCode = env("TRENDYOL_STOREFRONT_CODE");
    if (sellerId && apiKey && apiSecret && storeFrontCode) {
      return {
        mode: "live" as const,
        sellerId,
        apiKey,
        apiSecret,
        storeFrontCode,
        baseUrl: env("TRENDYOL_STAGE") === "1" ? "https://stageapigw.trendyol.com" : "https://apigw.trendyol.com",
      };
    }
    return { mode: "mock" as const };
  },
  email() {
    const apiKey = env("RESEND_API_KEY");
    const from = env("EMAIL_FROM") ?? "Hera Mağaza <siparis@heramagaza.com.tr>";
    return apiKey ? { mode: "live" as const, apiKey, from } : { mode: "mock" as const, from };
  },
  shipping() {
    // Geliver: resmi doküman ve hesap gelince gerçek adaptör eklenecek (docs/kararlar.md K-05).
    return { mode: "mock" as const };
  },
  invoice() {
    // Paraşüt: resmi doküman ve hesap gelince gerçek adaptör eklenecek (docs/kararlar.md K-05).
    return { mode: "mock" as const };
  },
  meta() {
    const pixelId = env("NEXT_PUBLIC_META_PIXEL_ID");
    const accessToken = env("META_CAPI_TOKEN");
    const graphVersion = env("META_GRAPH_VERSION");
    return pixelId && accessToken && graphVersion
      ? { mode: "live" as const, pixelId, accessToken, graphVersion, testEventCode: env("META_TEST_EVENT_CODE") }
      : { mode: "mock" as const };
  },
  cronSecret: () => env("CRON_SECRET"),
};

/** Mock ödeme sayfası yalnızca gerçek PayTR yapılandırılmamışken ve canlı yayında değilken açılır. */
export function mockPaymentsAllowed(): boolean {
  return integrations.paytr().mode === "mock" && (process.env.NODE_ENV !== "production" || process.env.PAYMENT_MOCK === "1");
}
