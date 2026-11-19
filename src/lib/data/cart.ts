/**
 * Sunucu tarafı sepet fiyatlandırma (F2-04). İstemciden yalnızca ürün kimliği, adet ve hediye
 * tercihi alınır; fiyat, stok, aktiflik, kupon ve kargo eşiği veritabanından okunur.
 * İstemcinin gönderdiği fiyat ASLA kullanılmaz (girdide fiyat alanı yoktur).
 * Next.js'e bağımlı değildir: entegrasyon testlerinde doğrudan çağrılır.
 */
import { asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { DbOrTx } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { checkCoupon, computeTotals, normalizeCouponCode, type CartTotals, type Coupon } from "@/lib/cart/pricing";
import { parseStoreSettings, type StoreSettings } from "@/lib/store-settings";
import { settings as staticSettings } from "@/lib/settings";

export const cartInputSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(99),
        giftWrap: z.boolean().default(false),
        giftNote: z.string().max(staticSettings.giftNoteMaxLength).default(""),
      }),
    )
    .max(50),
  couponCode: z.string().max(40).nullish(),
});
export type CartInput = z.input<typeof cartInputSchema>;

export type ServerCartLine = {
  productId: string;
  slug: string;
  name: string;
  image: { src: string; alt: string };
  priceKurus: number;
  stock: number;
  quantity: number;
  giftWrap: boolean;
  giftNote: string;
};

export type CartIssue =
  | { type: "removed"; productId: string; name: string | null; reason: "yok" | "tukendi" }
  | { type: "reduced"; productId: string; name: string; from: number; to: number }
  | { type: "price_changed"; productId: string; name: string };

export type PricedCart = {
  lines: ServerCartLine[];
  totals: CartTotals;
  coupon: Coupon | null;
  couponError: string | null;
  issues: CartIssue[];
  settings: StoreSettings;
};

export async function readStoreSettings(db: DbOrTx): Promise<StoreSettings> {
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, "store")).limit(1);
  return parseStoreSettings(row?.value);
}

/**
 * @param lock true ise ürün ve kupon satırları `FOR UPDATE` ile kilitlenir (yalnızca transaction içinde).
 * @param clientPrices (isteğe bağlı) istemcinin gösterdiği fiyatlar — yalnızca "fiyat değişti" uyarısı için.
 */
export async function priceCart(
  db: DbOrTx,
  rawInput: CartInput,
  options: { now?: Date; lock?: boolean; clientPrices?: Record<string, number> } = {},
): Promise<PricedCart> {
  const input = cartInputSchema.parse(rawInput);
  const now = options.now ?? new Date();
  // Aynı ürün iki satırda gelirse birleştir.
  const merged = new Map<string, (typeof input.lines)[number]>();
  for (const l of input.lines) {
    const prev = merged.get(l.productId);
    merged.set(l.productId, prev ? { ...prev, quantity: prev.quantity + l.quantity } : l);
  }
  const ids = [...merged.keys()].sort(); // sabit sıra: kilitlerde kilitlenme (deadlock) olmasın

  const productRows = ids.length
    ? await (options.lock
        ? db.select().from(s.products).where(inArray(s.products.id, ids)).orderBy(asc(s.products.id)).for("update")
        : db.select().from(s.products).where(inArray(s.products.id, ids)))
    : [];
  const imageRows = ids.length
    ? await db
        .select()
        .from(s.productImages)
        .where(inArray(s.productImages.productId, ids))
        .orderBy(asc(s.productImages.position))
    : [];

  const issues: CartIssue[] = [];
  const lines: ServerCartLine[] = [];
  for (const id of [...merged.keys()]) {
    const want = merged.get(id)!;
    const p = productRows.find((r) => r.id === id);
    if (!p || p.status !== "active") {
      issues.push({ type: "removed", productId: id, name: p?.name ?? null, reason: "yok" });
      continue;
    }
    if (p.stock <= 0) {
      issues.push({ type: "removed", productId: id, name: p.name, reason: "tukendi" });
      continue;
    }
    const quantity = Math.min(want.quantity, p.stock);
    if (quantity < want.quantity) issues.push({ type: "reduced", productId: id, name: p.name, from: want.quantity, to: quantity });
    const clientPrice = options.clientPrices?.[id];
    if (clientPrice !== undefined && clientPrice !== p.priceKurus) issues.push({ type: "price_changed", productId: id, name: p.name });
    const img = imageRows.find((im) => im.productId === id);
    lines.push({
      productId: id,
      slug: p.slug,
      name: p.name,
      image: { src: img?.url ?? "", alt: img?.alt ?? p.name },
      priceKurus: p.priceKurus,
      stock: p.stock,
      quantity,
      giftWrap: want.giftWrap,
      giftNote: want.giftWrap ? want.giftNote.trim() : "",
    });
  }

  const settings = await readStoreSettings(db);
  const subtotal = lines.reduce((n, l) => n + l.priceKurus * l.quantity, 0);

  let coupon: Coupon | null = null;
  let couponError: string | null = null;
  if (input.couponCode) {
    const code = normalizeCouponCode(input.couponCode);
    const q = db.select().from(s.coupons).where(eq(sql`upper(${s.coupons.code})`, code)).limit(1);
    const [row] = await (options.lock ? q.for("update") : q);
    const result = checkCoupon(row ?? null, subtotal, now);
    if (result.ok) coupon = result.coupon;
    else couponError = result.reason;
  }

  const totals = computeTotals(lines, coupon, settings);
  return { lines, totals, coupon: totals.coupon, couponError, issues, settings };
}
