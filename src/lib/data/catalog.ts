/**
 * TEK veri erişim noktası. Faz 2: PostgreSQL (Drizzle). İmzalar Faz 1 ile aynı (docs/01-mimari.md).
 * Vitrin verisi "catalog" etiketiyle önbelleklenir; sipariş/stok/yönetim değişikliklerinde
 * `updateTag(CATALOG_TAG)` ile yenilenir.
 */
import { asc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import {
  buildCollections,
  buildSearchIndex,
  filterOptions,
  filterProducts,
  relatedProducts,
  toSummary,
  type SearchEntry,
} from "./catalog-core";
import type {
  Collection,
  CollectionRecord,
  Product,
  ProductDetail,
  ProductFilter,
  ProductImage,
  ProductSummary,
} from "./schema";

export const CATALOG_TAG = "catalog";

type CatalogSnapshot = {
  /** Vitrinde listelenen (status = active) ürünler */
  active: Product[];
  /** Sayfası açık kalan ama listelenmeyen (archived) ürünler; stok 0 gösterilir */
  archived: Product[];
  collections: CollectionRecord[];
};

/** Tüm vitrin verisini tek seferde okur (ürün sayısı küçük; filtreleme bellekte yapılır). */
async function loadCatalog(): Promise<CatalogSnapshot> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const db = getDb();

  const [rows, images, cols, links] = await Promise.all([
    db.select().from(s.products).where(inArray(s.products.status, ["active", "archived"])),
    db.select().from(s.productImages).orderBy(asc(s.productImages.productId), asc(s.productImages.position)),
    db.select().from(s.collections).orderBy(asc(s.collections.position)),
    db
      .select({ productId: s.productCollections.productId, slug: s.collections.slug })
      .from(s.productCollections)
      .innerJoin(s.collections, eq(s.productCollections.collectionId, s.collections.id)),
  ]);

  const imagesBy = new Map<string, ProductImage[]>();
  for (const im of images) {
    const list = imagesBy.get(im.productId) ?? [];
    list.push({ src: im.url, alt: im.alt, width: im.width, height: im.height });
    imagesBy.set(im.productId, list);
  }
  const collectionsBy = new Map<string, string[]>();
  for (const l of links) collectionsBy.set(l.productId, [...(collectionsBy.get(l.productId) ?? []), l.slug]);
  const slugById = new Map(rows.map((r) => [r.id, r.slug]));

  const toProduct = (r: (typeof rows)[number]): Product => ({
    id: r.id,
    trendyolId: r.trendyolProductId,
    slug: r.slug,
    name: r.name,
    type: r.type,
    artist: r.artistName && r.artistSlug ? { name: r.artistName, slug: r.artistSlug } : null,
    artwork:
      r.artworkTitle && r.artworkYear && r.artworkStory
        ? { title: r.artworkTitle, year: r.artworkYear, story: r.artworkStory }
        : null,
    fabric: r.fabric,
    size: r.sizeLabel,
    priceKurus: r.priceKurus,
    compareAtPriceKurus: r.compareAtKurus ?? undefined,
    stock: r.status === "archived" ? 0 : r.stock,
    colors: r.colors,
    images: imagesBy.get(r.id) ?? [],
    description: r.description,
    care: r.careText,
    collections: collectionsBy.get(r.id) ?? [],
    isNew: r.isNew,
    createdAt: r.createdAt.toISOString().slice(0, 10),
  });

  // Görseli olmayan ürün vitrine çıkmaz (kart ve sayfa görsel varsayar).
  const products = rows.map(toProduct).filter((p) => p.images.length > 0);
  const active = products.filter((p) => rows.find((r) => r.id === p.id)?.status === "active");
  const archived = products.filter((p) => !active.includes(p));

  const collections: CollectionRecord[] = cols.map((c) => ({
    slug: c.slug,
    title: c.name,
    kicker: c.kicker,
    description: c.description,
    rule: c.rule,
    featured: c.featured,
    coverProduct: (c.coverProductId && slugById.get(c.coverProductId)) || active[0]?.slug || "",
  }));

  return { active, archived, collections };
}

export async function getProducts(filter: ProductFilter = {}): Promise<ProductSummary[]> {
  const c = await loadCatalog();
  return filterProducts(c.active, c.collections, filter).map(toSummary);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const c = await loadCatalog();
  return c.active.find((p) => p.slug === slug) ?? c.archived.find((p) => p.slug === slug) ?? null;
}

/** Slug değiştiyse yeni slug'ı döndürür (eski bağlantılar 308 ile yönlendirilir). */
export async function getProductRedirect(oldSlug: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const [row] = await getDb()
    .select({ slug: s.products.slug })
    .from(s.productSlugRedirects)
    .innerJoin(s.products, eq(s.productSlugRedirects.productId, s.products.id))
    .where(eq(s.productSlugRedirects.oldSlug, oldSlug))
    .limit(1);
  return row?.slug ?? null;
}

export async function getCollections(): Promise<Collection[]> {
  const c = await loadCatalog();
  const valid = c.collections.filter((col) => c.active.some((p) => p.slug === col.coverProduct));
  return buildCollections(c.active, valid);
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const all = await getCollections();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getRelatedProducts(productId: string, limit = 4): Promise<ProductSummary[]> {
  const c = await loadCatalog();
  const base = c.active.find((p) => p.id === productId) ?? c.archived.find((p) => p.id === productId);
  if (!base) return [];
  return relatedProducts([base, ...c.active.filter((p) => p.id !== productId)], productId, limit).map(toSummary);
}

export async function getSearchIndex(): Promise<SearchEntry[]> {
  const c = await loadCatalog();
  return buildSearchIndex(c.active);
}

export async function getFilterOptions(collection?: string) {
  const c = await loadCatalog();
  return filterOptions(filterProducts(c.active, c.collections, { collection }));
}

export async function getAllProductSlugs(): Promise<string[]> {
  const c = await loadCatalog();
  return [...c.active, ...c.archived].map((p) => p.slug);
}

export async function getAllCollectionSlugs(): Promise<string[]> {
  return (await getCollections()).map((c) => c.slug);
}

/** "Omuzlarda" şeridi: model üzerindeki kareler, şal ve eşarp dönüşümlü. */
export async function getModelShots(limit = 6): Promise<Array<{ slug: string; image: ProductImage }>> {
  const c = await loadCatalog();
  const shots = c.active.flatMap((p) => {
    const image = p.images.find((im) => im.alt.includes("model üzerinde"));
    return image ? [{ slug: p.slug, type: p.type, image }] : [];
  });
  const shawls = shots.filter((x) => x.type === "sal");
  const scarves = shots.filter((x) => x.type === "esarp");
  return Array.from({ length: Math.ceil(limit / 2) }, (_, i) => [shawls[i], scarves[i]])
    .flat()
    .filter((x) => x !== undefined)
    .slice(0, limit)
    .map(({ slug, image }) => ({ slug, image }));
}
