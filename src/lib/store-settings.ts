import { z } from "zod";
import { settings as staticSettings } from "./settings";

/**
 * Yönetim panelinden düzenlenebilen mağaza ayarları (settings tablosu, key = "store").
 * İstemciye de gönderilir; gizli bilgi içermez.
 */
export const storeSettingsSchema = z.object({
  freeShippingThresholdKurus: z.number().int().nonnegative(),
  shippingFeeKurus: z.number().int().nonnegative(),
  giftWrapPriceKurus: z.number().int().nonnegative(),
  /** Duyuru bandının ikinci yarısı (ilk yarı: ücretsiz kargo eşiği). */
  announcement: z.string().trim().max(80),
  paymentMethods: z
    .object({ kart: z.boolean(), havale: z.boolean(), kapida: z.boolean() })
    .refine((m) => m.kart || m.havale || m.kapida, "En az bir ödeme yöntemi açık olmalı."),
  /** Ödeme beklenen siparişin stoku kaç dakika tutulur. */
  orderHoldMinutes: z.number().int().min(5).max(24 * 60),
});
export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  freeShippingThresholdKurus: staticSettings.freeShippingThresholdKurus,
  shippingFeeKurus: staticSettings.shippingFeeKurus,
  giftWrapPriceKurus: staticSettings.giftWrapPriceKurus,
  announcement: "Her sipariş hediye kutusunda",
  paymentMethods: { ...staticSettings.paymentMethods },
  orderHoldMinutes: 30,
};

export function parseStoreSettings(value: unknown): StoreSettings {
  const r = storeSettingsSchema.safeParse({ ...DEFAULT_STORE_SETTINGS, ...(typeof value === "object" ? value : {}) });
  return r.success ? r.data : DEFAULT_STORE_SETTINGS;
}
