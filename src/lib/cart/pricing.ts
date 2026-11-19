import { percentOf, sumKurus } from "@/lib/money";
import { toAsciiLower } from "@/lib/slugify";

/**
 * Sepet fiyat hesabı — saf fonksiyon. İstemci gösterim için, sunucu (lib/data/cart.ts) tek doğru
 * kaynak olarak aynı fonksiyonu kullanır. Tüm tutarlar kuruş.
 */
export type PricedLine = { priceKurus: number; quantity: number; giftWrap: boolean };

export type Coupon = {
  code: string;
  label: string;
  type: "percent" | "fixed";
  /** percent: 1–100, fixed: kuruş */
  value: number;
  minSubtotalKurus: number;
};

export type PricingConfig = {
  freeShippingThresholdKurus: number;
  shippingFeeKurus: number;
  giftWrapPriceKurus: number;
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
  /** Uygulanan kupon (koşulu sağlamıyorsa null). */
  coupon: Coupon | null;
};

/** Türkçe klavyede "hosgeldin10" → "HOSGELDİN10" olur; ASCII büyük harfe indirger. */
export function normalizeCouponCode(code: string): string {
  return toAsciiLower(code.trim()).toUpperCase();
}

export function couponDiscount(coupon: Coupon, subtotalKurus: number): number {
  if (subtotalKurus < coupon.minSubtotalKurus) return 0;
  return coupon.type === "percent" ? percentOf(subtotalKurus, coupon.value) : Math.min(coupon.value, subtotalKurus);
}

export function computeTotals(lines: readonly PricedLine[], coupon: Coupon | null, config: PricingConfig): CartTotals {
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotalKurus = sumKurus(lines.map((l) => l.priceKurus * l.quantity));
  const discountKurus = coupon ? couponDiscount(coupon, subtotalKurus) : 0;
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
    coupon: discountKurus > 0 ? coupon : null,
  };
}

export type CouponRecord = Coupon & {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
};

export type CouponCheck = { ok: true; coupon: Coupon } | { ok: false; reason: string };

/** Kuponun şu an ve bu ara toplamla kullanılabilir olup olmadığı. */
export function checkCoupon(record: CouponRecord | null, subtotalKurus: number, now: Date): CouponCheck {
  if (!record || !record.active) return { ok: false, reason: "Bu kupon kodu geçerli değil." };
  if (record.startsAt && now < record.startsAt) return { ok: false, reason: "Bu kupon henüz başlamadı." };
  if (record.endsAt && now > record.endsAt) return { ok: false, reason: "Bu kuponun süresi doldu." };
  if (record.usageLimit !== null && record.usedCount >= record.usageLimit) {
    return { ok: false, reason: "Bu kuponun kullanım hakkı doldu." };
  }
  if (subtotalKurus < record.minSubtotalKurus) {
    const lira = (record.minSubtotalKurus / 100).toLocaleString("tr-TR");
    return { ok: false, reason: `Bu kupon ${lira} TL ve üzeri alışverişte geçerli.` };
  }
  const { code, label, type, value, minSubtotalKurus } = record;
  return { ok: true, coupon: { code, label, type, value, minSubtotalKurus } };
}
