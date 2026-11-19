/**
 * TEK veri erişim noktası (Faz 1: JSON, Faz 2: Drizzle). Sayfalar yalnızca buradan okur.
 * Sözleşme: docs/01-mimari.md → "Veri katmanı sözleşmesi".
 */
import { cacheLife } from "next/cache";
import collectionsJson from "@/content/collections.json";
import productsJson from "@/content/products.json";
import {
  buildCollections,
  buildSearchIndex,
  filterOptions,
  filterProducts,
  relatedProducts,
  toSummary,
  type SearchEntry,
} from "./catalog-core";
import {
  parseCatalog,
  type Collection,
  type ProductDetail,
  type ProductFilter,
  type ProductSummary,
} from "./schema";

// Modül yüklenirken doğrulanır: hatalı JSON derlemeyi (next build) kırar.
const catalog = parseCatalog(productsJson, collectionsJson);

export async function getProducts(filter: ProductFilter = {}): Promise<ProductSummary[]> {
  "use cache";
  cacheLife("hours");
  return filterProducts(catalog.products, catalog.collections, filter).map(toSummary);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");
  return catalog.products.find((p) => p.slug === slug) ?? null;
}

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheLife("hours");
  return buildCollections(catalog.products, catalog.collections);
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const all = await getCollections();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getRelatedProducts(productId: string, limit = 4): Promise<ProductSummary[]> {
  "use cache";
  cacheLife("hours");
  return relatedProducts(catalog.products, productId, limit).map(toSummary);
}

export async function getSearchIndex(): Promise<SearchEntry[]> {
  "use cache";
  cacheLife("hours");
  return buildSearchIndex(catalog.products);
}

export async function getFilterOptions(collection?: string) {
  "use cache";
  cacheLife("hours");
  return filterOptions(filterProducts(catalog.products, catalog.collections, { collection }));
}

export async function getAllProductSlugs(): Promise<string[]> {
  return catalog.products.map((p) => p.slug);
}

export async function getAllCollectionSlugs(): Promise<string[]> {
  return catalog.collections.map((c) => c.slug);
}
