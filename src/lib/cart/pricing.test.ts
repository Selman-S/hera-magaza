import { describe, expect, it } from "vitest";
import { checkCoupon, computeTotals, normalizeCouponCode, type Coupon, type CouponRecord, type PricingConfig } from "./pricing";

const config: PricingConfig = { freeShippingThresholdKurus: 100_000, shippingFeeKurus: 8_990, giftWrapPriceKurus: 2_500 };
const pct10: Coupon = { code: "HOSGELDIN10", label: "%10", type: "percent", value: 10, minSubtotalKurus: 0 };

describe("computeTotals", () => {
  it("boş sepet: her şey sıfır, kargo yok", () => {
    const t = computeTotals([], null, config);
    expect(t.totalKurus).toBe(0);
    expect(t.shippingKurus).toBe(0);
  });

  it("eşik altı: kargo eklenir, kalan tutar hesaplanır", () => {
    const t = computeTotals([{ priceKurus: 85_000, quantity: 1, giftWrap: false }], null, config);
    expect(t.shippingKurus).toBe(8_990);
    expect(t.remainingForFreeShippingKurus).toBe(15_000);
    expect(t.totalKurus).toBe(93_990);
  });

  it("eşik üstü: kargo ücretsiz", () => {
    const t = computeTotals([{ priceKurus: 119_900, quantity: 1, giftWrap: false }], null, config);
    expect(t.shippingKurus).toBe(0);
    expect(t.totalKurus).toBe(119_900);
  });

  it("yüzde kupon kuruş olarak, kargo eşiği indirim sonrası tutara göre", () => {
    const t = computeTotals([{ priceKurus: 109_900, quantity: 1, giftWrap: false }], pct10, config);
    expect(t.discountKurus).toBe(10_990);
    expect(t.shippingKurus).toBe(8_990); // 98.910 < 100.000
    expect(t.totalKurus).toBe(109_900 - 10_990 + 8_990);
  });

  it("sabit tutarlı kupon ara toplamı aşamaz", () => {
    const fixed: Coupon = { code: "X", label: "200 TL", type: "fixed", value: 20_000, minSubtotalKurus: 0 };
    expect(computeTotals([{ priceKurus: 15_000, quantity: 1, giftWrap: false }], fixed, config).discountKurus).toBe(15_000);
  });

  it("alt limitin altında kupon uygulanmaz", () => {
    const min: Coupon = { ...pct10, minSubtotalKurus: 200_000 };
    const t = computeTotals([{ priceKurus: 119_900, quantity: 1, giftWrap: false }], min, config);
    expect(t.discountKurus).toBe(0);
    expect(t.coupon).toBeNull();
  });

  it("hediye paketi adet başına", () => {
    const t = computeTotals([{ priceKurus: 119_900, quantity: 2, giftWrap: true }], null, config);
    expect(t.giftWrapKurus).toBe(5_000);
    expect(t.totalKurus).toBe(239_800 + 5_000);
  });
});

describe("kupon", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const rec: CouponRecord = { ...pct10, active: true, startsAt: null, endsAt: null, usageLimit: null, usedCount: 0 };

  it("kodu Türkçe büyük/küçük harften bağımsız normalleştirir", () => {
    expect(normalizeCouponCode(" hosgeldin10 ")).toBe("HOSGELDIN10");
    expect(normalizeCouponCode("HOSGELDİN10")).toBe("HOSGELDIN10");
  });
  it("geçerli kupon", () => {
    expect(checkCoupon(rec, 50_000, now).ok).toBe(true);
  });
  it("pasif, süresi dolmuş, başlamamış, limiti dolmuş kupon reddedilir", () => {
    expect(checkCoupon({ ...rec, active: false }, 50_000, now).ok).toBe(false);
    expect(checkCoupon({ ...rec, endsAt: new Date("2026-11-01") }, 50_000, now).ok).toBe(false);
    expect(checkCoupon({ ...rec, startsAt: new Date("2026-12-01") }, 50_000, now).ok).toBe(false);
    expect(checkCoupon({ ...rec, usageLimit: 5, usedCount: 5 }, 50_000, now).ok).toBe(false);
    expect(checkCoupon(null, 50_000, now).ok).toBe(false);
  });
  it("alt limit mesajı", () => {
    const r = checkCoupon({ ...rec, minSubtotalKurus: 150_000 }, 50_000, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("1.500 TL");
  });
});
