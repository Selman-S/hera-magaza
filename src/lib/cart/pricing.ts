import { percentOf, sumKurus } from "@/lib/money";
import { toAsciiLower } from "@/lib/slugify";

export type PricedLine = { priceKurus: number; quantity: number; giftWrap: boolean };

export type Coupon = { code: string; percent: number; label: string };

export type PricingConfig = {
  freeShippingThresholdKurus: number;
  shippingFeeKurus: number;
  giftWrapPriceKurus: number;
  coupons: readonly Coupon[];
};

export type CartTotals = {
  itemCount: number;
  subtotalKurus: number;
  discountKurus: number;
  giftWrapKurus: number;
  shippingKurus: number;
  totalKurus: number;
  /** Ücretsiz kargoya kalan tutar (0 ise kazanıldı). İndirim sonrası ara toplama göre. */
  remainingForFreeShippingKurus: number;
  coupon: Coupon | null;
};

export function findCoupon(code: string | null | undefined, coupons: readonly Coupon[]): Coupon | null {
  if (!code) return null;
  // Türkçe klavyede "hosgeldin10" → "HOSGELDİN10" olur; ASCII'ye indirgeyerek karşılaştır.
  const normalized = toAsciiLower(code.trim());
  return coupons.find((c) => toAsciiLower(c.code) === normalized) ?? null;
}

export function computeTotals(
  lines: readonly PricedLine[],
  couponCode: string | null | undefined,
  config: PricingConfig,
): CartTotals {
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotalKurus = sumKurus(lines.map((l) => l.priceKurus * l.quantity));
  const coupon = findCoupon(couponCode, config.coupons);
  const discountKurus = coupon ? percentOf(subtotalKurus, coupon.percent) : 0;
  const giftWrapKurus = sumKurus(lines.map((l) => (l.giftWrap ? config.giftWrapPriceKurus * l.quantity : 0)));
  const afterDiscount = subtotalKurus - discountKurus;
  const freeShipping = afterDiscount >= config.freeShippingThresholdKurus;
  const shippingKurus = itemCount === 0 || freeShipping ? 0 : config.shippingFeeKurus;
  return {
    itemCount,
    subtotalKurus,
    discountKurus,
    giftWrapKurus,
    shippingKurus,
    totalKurus: afterDiscount + giftWrapKurus + shippingKurus,
    remainingForFreeShippingKurus: Math.max(0, config.freeShippingThresholdKurus - afterDiscount),
    coupon,
  };
}
