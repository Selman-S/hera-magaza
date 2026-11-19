/** Yönetim paneli: ürün verisi ve kayıt mantığı (Next.js'ten bağımsız; eylemler bunu çağırır). */
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db, Tx } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { slugify } from "@/lib/slugify";
import { parseTRYToKurus } from "./money-input";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));
const money = (label: string, required: boolean) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") {
        if (required) ctx.addIssue({ code: "custom", message: `${label} gerekli.` });
        return null;
      }
      const k = parseTRYToKurus(v);
      if (k === null) ctx.addIssue({ code: "custom", message: `${label} geçerli bir tutar değil (ör. 1199 veya 1.199,90).` });
      return k;
    });

export const ARTISTS = [
  { slug: "van-gogh", name: "Vincent van Gogh" },
  { slug: "klimt", name: "Gustav Klimt" },
] as const;

export const productFormSchema = z
  .object({
    name: z.string().trim().min(5, "Ad en az 5 karakter olmalı.").max(140),
    slug: z.string().trim().max(160),
    type: z.enum(["sal", "esarp", "pareo"]),
    status: z.enum(["draft", "active", "archived"]),
    artistSlug: z.string().trim(),
    artworkTitle: optionalText,
    artworkYear: optionalText,
    artworkStory: optionalText,
    fabric: z.string().trim().min(2, "Kumaş gerekli."),
    sizeLabel: z.string().trim().min(2, "Ölçü gerekli (ör. 70×175 veya Standart)."),
    price: money("Fiyat", true),
    compareAt: money("İndirimsiz fiyat", false),
    trendyolPrice: money("Trendyol fiyatı", false),
    stock: z.coerce.number().int("Stok tam sayı olmalı.").min(0, "Stok negatif olamaz.").max(9999),
    sku: optionalText,
    barcode: optionalText,
    trendyolProductId: optionalText,
    colors: z.string().trim(),
    description: z.string().trim().min(20, "Açıklama en az 20 karakter olmalı."),
    careText: z.string().trim().min(10, "Bakım bilgisi gerekli."),
    isNew: z.boolean(),
    collectionIds: z.array(z.coerce.number().int()),
  })
  .superRefine((v, ctx) => {
    if (v.price !== null && v.price <= 0) ctx.addIssue({ code: "custom", path: ["price"], message: "Fiyat sıfırdan büyük olmalı." });
    if (v.compareAt !== null && v.price !== null && v.compareAt <= v.price) {
      ctx.addIssue({ code: "custom", path: ["compareAt"], message: "İndirimsiz fiyat, satış fiyatından yüksek olmalı." });
    }
    if (v.artistSlug && !ARTISTS.some((a) => a.slug === v.artistSlug)) {
      ctx.addIssue({ code: "custom", path: ["artistSlug"], message: "Listeden bir sanatçı seçin." });
    }
    const story = [v.artworkTitle, v.artworkYear, v.artworkStory].filter(Boolean).length;
    if (story > 0 && story < 3) {
      ctx.addIssue({ code: "custom", path: ["artworkStory"], message: "Eser künyesi için eser adı, yıl ve hikâyenin üçü de gerekli." });
    }
  });

export type ProductFormValues = z.output<typeof productFormSchema>;

export function productFormFromData(fd: FormData) {
  const str = (k: string) => String(fd.get(k) ?? "");
  return {
    name: str("name"),
    slug: str("slug"),
    type: str("type"),
    status: str("status"),
    artistSlug: str("artistSlug"),
    artworkTitle: str("artworkTitle"),
    artworkYear: str("artworkYear"),
    artworkStory: str("artworkStory"),
    fabric: str("fabric"),
    sizeLabel: str("sizeLabel"),
    price: str("price"),
    compareAt: str("compareAt"),
    trendyolPrice: str("trendyolPrice"),
    stock: str("stock"),
    sku: str("sku"),
    barcode: str("barcode"),
    trendyolProductId: str("trendyolProductId"),
    colors: str("colors"),
    description: str("description"),
    careText: str("careText"),
    isNew: fd.get("isNew") === "on",
    collectionIds: fd.getAll("collectionIds").map(String),
  };
}

function toRow(v: ProductFormValues) {
  const artist = ARTISTS.find((a) => a.slug === v.artistSlug) ?? null;
  const size = v.sizeLabel.replace(/x/i, "×");
  const m = size.match(/^(\d+)×(\d+)$/);
  return {
    name: v.name,
    type: v.type,
    status: v.status,
    artistName: artist?.name ?? null,
    artistSlug: artist?.slug ?? null,
    artworkTitle: v.artworkTitle,
    artworkYear: v.artworkYear,
    artworkStory: v.artworkStory,
    fabric: v.fabric,
    sizeLabel: size,
    widthCm: m ? Number(m[1]) : null,
    lengthCm: m ? Number(m[2]) : null,
    priceKurus: v.price!,
    compareAtKurus: v.compareAt,
    trendyolPriceKurus: v.trendyolPrice,
    sku: v.sku,
    barcode: v.barcode,
    trendyolProductId: v.trendyolProductId,
    colors: v.colors
      .split(",")
      .map((c) => c.trim().toLocaleLowerCase("tr"))
      .filter(Boolean),
    description: v.description,
    careText: v.careText,
    isNew: v.isNew,
  };
}

async function uniqueSlug(tx: Tx, wanted: string, exceptId?: string): Promise<string> {
  const base = slugify(wanted) || "urun";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const [taken] = await tx
      .select({ id: s.products.id })
      .from(s.products)
      .where(eq(s.products.slug, candidate))
      .limit(1);
    const [redirect] = await tx
      .select({ productId: s.productSlugRedirects.productId })
      .from(s.productSlugRedirects)
      .where(eq(s.productSlugRedirects.oldSlug, candidate))
      .limit(1);
    const free = (!taken || taken.id === exceptId) && (!redirect || redirect.productId === exceptId);
    if (free) return candidate;
  }
  throw new Error("Benzersiz slug üretilemedi");
}

async function nextProductId(tx: Tx): Promise<string> {
  const [row] = await tx.execute<{ n: number | null }>(
    sql`SELECT max(substring(id from 4)::int) AS n FROM products WHERE id ~ '^hr-[0-9]+$'`,
  );
  return `hr-${String((row?.n ?? 0) + 1).padStart(3, "0")}`;
}

async function setCollections(tx: Tx, productId: string, collectionIds: number[]) {
  await tx.delete(s.productCollections).where(eq(s.productCollections.productId, productId));
  const manual = collectionIds.length
    ? await tx
        .select({ id: s.collections.id })
        .from(s.collections)
        .where(and(inArray(s.collections.id, collectionIds), eq(s.collections.rule, "manual")))
    : [];
  if (manual.length) await tx.insert(s.productCollections).values(manual.map((c) => ({ productId, collectionId: c.id })));
}

export async function createProduct(db: Db, v: ProductFormValues, actor: string): Promise<{ id: string; slug: string }> {
  return db.transaction(async (tx) => {
    const id = await nextProductId(tx);
    const slug = await uniqueSlug(tx, v.slug || v.name);
    await tx.insert(s.products).values({ id, slug, ...toRow(v), stock: v.stock, sku: v.sku ?? id.toUpperCase() });
    if (v.stock > 0) await tx.insert(s.inventoryMovements).values({ productId: id, delta: v.stock, reason: "manual", actor, refId: "olusturma" });
    await setCollections(tx, id, v.collectionIds);
    return { id, slug };
  });
}

export type UpdateResult = { slug: string; oldSlug: string; before: Record<string, unknown>; after: Record<string, unknown> };

/** Günceller. Stok mutlak değer olarak gelir; fark stok hareketi olarak yazılır. Slug değişirse eski slug yönlendirilir. */
export async function updateProduct(db: Db, id: string, v: ProductFormValues, actor: string): Promise<UpdateResult | null> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(s.products).where(eq(s.products.id, id)).for("update");
    if (!before) return null;
    const wantedSlug = slugify(v.slug || v.name);
    const slug = wantedSlug === before.slug ? before.slug : await uniqueSlug(tx, wantedSlug, id);
    const row = toRow(v);
    await tx.update(s.products).set({ ...row, slug, stock: v.stock }).where(eq(s.products.id, id));
    if (v.stock !== before.stock) {
      await tx.insert(s.inventoryMovements).values({ productId: id, delta: v.stock - before.stock, reason: "manual", actor });
    }
    if (slug !== before.slug) {
      await tx
        .insert(s.productSlugRedirects)
        .values({ oldSlug: before.slug, productId: id })
        .onConflictDoUpdate({ target: s.productSlugRedirects.oldSlug, set: { productId: id } });
      // Yeni slug daha önce bu ürünün eski slug'ıysa döngü olmasın.
      await tx.delete(s.productSlugRedirects).where(eq(s.productSlugRedirects.oldSlug, slug));
    }
    await setCollections(tx, id, v.collectionIds);
    return {
      slug,
      oldSlug: before.slug,
      before: { ...before, stock: before.stock } as Record<string, unknown>,
      after: { ...row, slug, stock: v.stock },
    };
  });
}

/** Listeden hızlı stok/fiyat düzenleme. */
export async function quickUpdateProduct(
  db: Db,
  id: string,
  patch: { stock?: number; priceKurus?: number; trendyolPriceKurus?: number | null },
  actor: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(s.products).where(eq(s.products.id, id)).for("update");
    if (!before) return null;
    await tx.update(s.products).set(patch).where(eq(s.products.id, id));
    if (patch.stock !== undefined && patch.stock !== before.stock) {
      await tx.insert(s.inventoryMovements).values({ productId: id, delta: patch.stock - before.stock, reason: "manual", actor });
    }
    return before;
  });
}

export async function listProductsForAdmin(db: Db, opts: { q?: string; status?: "draft" | "active" | "archived" }) {
  const conds = [];
  if (opts.status) conds.push(eq(s.products.status, opts.status));
  if (opts.q) {
    const like = `%${opts.q}%`;
    conds.push(or(ilike(s.products.name, like), ilike(s.products.slug, like), ilike(s.products.sku, like), ilike(s.products.id, like)));
  }
  const rows = await db
    .select({
      id: s.products.id,
      name: s.products.name,
      slug: s.products.slug,
      status: s.products.status,
      stock: s.products.stock,
      priceKurus: s.products.priceKurus,
      trendyolPriceKurus: s.products.trendyolPriceKurus,
      type: s.products.type,
      updatedAt: s.products.updatedAt,
      image: sql<string | null>`(SELECT pi.url FROM product_images pi WHERE pi.product_id = "products"."id" ORDER BY pi.position LIMIT 1)`,
    })
    .from(s.products)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.products.createdAt), asc(s.products.id));
  return rows;
}

export async function getProductForAdmin(db: Db, id: string) {
  const [product] = await db.select().from(s.products).where(eq(s.products.id, id)).limit(1);
  if (!product) return null;
  const [images, links, collections, movements] = await Promise.all([
    db.select().from(s.productImages).where(eq(s.productImages.productId, id)).orderBy(asc(s.productImages.position)),
    db.select().from(s.productCollections).where(eq(s.productCollections.productId, id)),
    db.select().from(s.collections).orderBy(asc(s.collections.position)),
    db
      .select()
      .from(s.inventoryMovements)
      .where(eq(s.inventoryMovements.productId, id))
      .orderBy(desc(s.inventoryMovements.createdAt))
      .limit(15),
  ]);
  return { product, images, collectionIds: links.map((l) => l.collectionId), collections, movements };
}
