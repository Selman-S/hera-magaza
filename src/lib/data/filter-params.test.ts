import { describe, expect, it } from "vitest";
import { activeFilterCount, parseFilterParams } from "./filter-params";

const sizes = ["70×175", "70×180", "95×95"];

describe("parseFilterParams", () => {
  it("geçerli parametreleri okur", () => {
    const f = parseFilterParams({ tip: "sal", sanatci: "van-gogh", olcu: "70x175", fiyat: "1150-", stok: "1", sirala: "fiyat-artan" }, sizes);
    expect(f).toEqual({
      type: "sal",
      artist: "van-gogh",
      size: "70×175",
      minPriceKurus: 115_000,
      maxPriceKurus: undefined,
      inStockOnly: true,
      sort: "fiyat-artan",
    });
  });
  it("geçersiz değerleri yok sayar", () => {
    const f = parseFilterParams({ tip: "canta", olcu: "1x1", fiyat: "abc", sirala: "rastgele", sanatci: "<script>" }, sizes);
    expect(f.type).toBeUndefined();
    expect(f.size).toBeUndefined();
    expect(f.minPriceKurus).toBeUndefined();
    expect(f.artist).toBeUndefined();
    expect(f.sort).toBe("yeni");
  });
  it("aktif filtre sayısı", () => {
    expect(activeFilterCount({ tip: "sal", sirala: "yeni" })).toBe(1);
  });
});
