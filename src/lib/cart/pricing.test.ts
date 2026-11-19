import { describe, expect, it } from "vitest";
import { computeTotals, findCoupon, type PricingConfig } from "./pricing";

const config: PricingConfig = {
  freeShippingThresholdKurus: 100_000,
  shippingFeeKurus: 8_990,
  giftWrapPriceKurus: 2_500,
  coupons: [{ code: "HOSGELDIN10", percent: 10, label: "%10" }],
};

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
    expect(t.remainingForFreeShippingKurus).toBe(0);
    expect(t.totalKurus).toBe(119_900);
  });

  it("kupon indirimi kuruş olarak, kargo eşiği indirim sonrası tutara göre", () => {
    const t = computeTotals([{ priceKurus: 109_900, quantity: 1, giftWrap: false }], "hosgeldin10", config);
    expect(t.discountKurus).toBe(10_990);
    expect(t.shippingKurus).toBe(8_990); // 98.910 < 100.000
    expect(t.totalKurus).toBe(109_900 - 10_990 + 8_990);
  });

  it("hediye paketi adet başına", () => {
    const t = computeTotals([{ priceKurus: 119_900, quantity: 2, giftWrap: true }], null, config);
    expect(t.giftWrapKurus).toBe(5_000);
    expect(t.itemCount).toBe(2);
    expect(t.totalKurus).toBe(239_800 + 5_000);
  });

  it("geçersiz kupon yok sayılır", () => {
    expect(findCoupon("YOK", config.coupons)).toBeNull();
    expect(findCoupon(" hosgeldin10 ", config.coupons)?.percent).toBe(10);
    expect(findCoupon("HOSGELDİN10", config.coupons)?.percent).toBe(10);
  });
});
