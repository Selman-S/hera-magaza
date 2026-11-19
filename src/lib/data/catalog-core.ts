/**
 * Kataloğun saf (çerçeveden bağımsız) mantığı: filtreleme, sıralama, özetleme.
 * `catalog.ts` bunu önbellekle sarar; testler doğrudan bunu çağırır.
 */
import { buildHaystack } from "@/lib/search";
import type {
  Collection,
  CollectionRecord,
  Product,
  ProductFilter,
  ProductSummary,
  SortKey,
} from "./schema";

export function toSummary(p: Product): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    artist: p.artist,
    fabric: p.fabric,
    size: p.size,
    priceKurus: p.priceKurus,
    compareAtPriceKurus: p.compareAtPriceKurus,
    stock: p.stock,
    isNew: p.isNew,
    createdAt: p.createdAt,
    images: p.images.slice(0, 2),
  };
}

export function inCollection(p: Product, c: CollectionRecord): boolean {
  return c.rule === "all" || p.collections.includes(c.slug);
}

function compare(sort: SortKey) {
  return (a: Product, b: Product): number => {
    // Tükenenler her sıralamada sona.
    const stockDiff = Number(b.stock > 0) - Number(a.stock > 0);
    if (stockDiff !== 0) return stockDiff;
    switch (sort) {
      case "fiyat-artan":
        return a.priceKurus - b.priceKurus || a.name.localeCompare(b.name, "tr");
      case "fiyat-azalan":
        return b.priceKurus - a.priceKurus || a.name.localeCompare(b.name, "tr");
      case "yeni":
        return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    }
  };
}

export function filterProducts(
  products: readonly Product[],
  collections: readonly CollectionRecord[],
  filter: ProductFilter = {},
): Product[] {
  const collection = filter.collection
    ? collections.find((c) => c.slug === filter.collection)
    : undefined;
  if (filter.collection && !collection) return [];

  return products
    .filter((p) => (collection ? inCollection(p, collection) : true))
    .filter((p) => (filter.type ? p.type === filter.type : true))
    .filter((p) => (filter.artist ? p.artist?.slug === filter.artist : true))
    .filter((p) => (filter.size ? p.size === filter.size : true))
    .filter((p) => (filter.minPriceKurus !== undefined ? p.priceKurus >= filter.minPriceKurus : true))
    .filter((p) => (filter.maxPriceKurus !== undefined ? p.priceKurus <= filter.maxPriceKurus : true))
    .filter((p) => (filter.inStockOnly ? p.stock > 0 : true))
    .sort(compare(filter.sort ?? "yeni"));
}

export function buildCollections(
  products: readonly Product[],
  collections: readonly CollectionRecord[],
): Collection[] {
  return collections.map((c) => {
    const cover = products.find((p) => p.slug === c.coverProduct);
    if (!cover) throw new Error(`Kapak ürünü yok: ${c.coverProduct}`);
    return {
      ...c,
      productCount: products.filter((p) => inCollection(p, c)).length,
      cover: cover.images[0],
    };
  });
}

/** Aynı sanatçı/tip öncelikli, stoktakiler önce. */
export function relatedProducts(products: readonly Product[], productId: string, limit: number): Product[] {
  const base = products.find((p) => p.id === productId);
  if (!base) return [];
  const score = (p: Product) =>
    (p.artist && base.artist && p.artist.slug === base.artist.slug ? 2 : 0) +
    (p.type === base.type ? 1 : 0) +
    (p.stock > 0 ? 1 : 0);
  return products
    .filter((p) => p.id !== productId)
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.p);
}

export type SearchEntry = {
  slug: string;
  name: string;
  priceKurus: number;
  stock: number;
  image: { src: string; alt: string };
  haystack: string;
};

export function buildSearchIndex(products: readonly Product[]): SearchEntry[] {
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    priceKurus: p.priceKurus,
    stock: p.stock,
    image: { src: p.images[0].src, alt: p.images[0].alt },
    haystack: buildHaystack([
      p.name,
      p.artist?.name,
      p.artwork?.title,
      p.fabric,
      p.type === "sal" ? "şal" : p.type === "esarp" ? "eşarp" : "pareo",
      ...p.colors,
    ]),
  }));
}

/** Filtre arayüzü için mevcut seçenekler. */
export function filterOptions(products: readonly Product[]) {
  const artists = new Map<string, string>();
  const sizes = new Set<string>();
  const types = new Set<Product["type"]>();
  for (const p of products) {
    if (p.artist) artists.set(p.artist.slug, p.artist.name);
    sizes.add(p.size);
    types.add(p.type);
  }
  return {
    artists: [...artists].map(([slug, name]) => ({ slug, name })),
    sizes: [...sizes].sort(),
    types: [...types],
  };
}
