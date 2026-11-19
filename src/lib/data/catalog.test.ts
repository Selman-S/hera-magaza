import { describe, expect, it } from "vitest";
import collectionsJson from "@/content/collections.json";
import productsJson from "@/content/products.json";
import { buildSearchIndex, filterProducts, relatedProducts } from "./catalog-core";
import { parseCatalog } from "./schema";
import { matches } from "@/lib/search";

const { products, collections } = parseCatalog(productsJson, collectionsJson);

describe("katalog verisi", () => {
  it("21 ürün Zod ile doğrulanıyor", () => {
    expect(products).toHaveLength(21);
  });

  it("hatalı veriyi reddediyor", () => {
    const broken = structuredClone(productsJson) as Array<Record<string, unknown>>;
    broken[0].priceKurus = 1199.9;
    expect(() => parseCatalog(broken, collectionsJson)).toThrow();
  });

  it("bilinmeyen koleksiyonu reddediyor", () => {
    const broken = structuredClone(productsJson) as Array<Record<string, unknown>>;
    broken[0].collections = ["yok-boyle-bir-koleksiyon"];
    expect(() => parseCatalog(broken, collectionsJson)).toThrow(/bilinmeyen koleksiyon/);
  });

  it("tekrarlanan slug'ı reddediyor", () => {
    const broken = structuredClone(productsJson) as Array<Record<string, unknown>>;
    broken[1].slug = broken[0].slug;
    expect(() => parseCatalog(broken, collectionsJson)).toThrow(/slug/);
  });
});

describe("filtreleme", () => {
  it("koleksiyona göre", () => {
    const esarp = filterProducts(products, collections, { collection: "esarplar" });
    expect(esarp.length).toBe(6);
    expect(esarp.every((p) => p.type === "esarp")).toBe(true);
  });

  it("'tumu' koleksiyonu hepsini içerir", () => {
    expect(filterProducts(products, collections, { collection: "tumu" })).toHaveLength(21);
  });

  it("bilinmeyen koleksiyon boş döner", () => {
    expect(filterProducts(products, collections, { collection: "yok" })).toEqual([]);
  });

  it("tip + sanatçı + stok", () => {
    const r = filterProducts(products, collections, { type: "sal", artist: "van-gogh", inStockOnly: true });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.type === "sal" && p.artist?.slug === "van-gogh" && p.stock > 0)).toBe(true);
  });

  it("fiyat aralığı", () => {
    const r = filterProducts(products, collections, { maxPriceKurus: 110000 });
    expect(r.every((p) => p.priceKurus <= 110000)).toBe(true);
    expect(r.some((p) => p.type === "pareo")).toBe(true);
  });

  it("fiyat artan sıralama, tükenenler sonda", () => {
    const r = filterProducts(products, collections, { sort: "fiyat-artan" });
    const inStock = r.filter((p) => p.stock > 0);
    for (let i = 1; i < inStock.length; i++) {
      expect(inStock[i].priceKurus).toBeGreaterThanOrEqual(inStock[i - 1].priceKurus);
    }
    expect(r[r.length - 1].stock).toBe(0);
  });
});

describe("benzer ürünler", () => {
  it("kendisini içermez, limit uygular", () => {
    const r = relatedProducts(products, "hr-001", 4);
    expect(r).toHaveLength(4);
    expect(r.some((p) => p.id === "hr-001")).toBe(false);
  });
});

describe("arama dizini", () => {
  const index = buildSearchIndex(products);
  const search = (q: string) => index.filter((e) => matches(e.haystack, q)).map((e) => e.slug);
  it('"van gogh" / "Van Gogh" / "vangogh" aynı', () => {
    const a = search("van gogh");
    expect(a.length).toBeGreaterThan(5);
    expect(search("Van Gogh")).toEqual(a);
    expect(search("vangogh")).toEqual(a);
  });
  it("renge göre bulur", () => {
    expect(search("turkuaz").length).toBeGreaterThan(1);
  });
});
