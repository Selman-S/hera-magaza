import { productTypeSchema, sortKeySchema, type ProductFilter } from "./schema";

/** URL parametreleri ↔ filtre. Paylaşılabilir: ?tip=sal&sanatci=van-gogh&olcu=70x175&fiyat=0-1100&stok=1&sirala=fiyat-artan */
export type FilterSearchParams = Record<string, string | string[] | undefined>;

export const PRICE_RANGES = [
  { value: "0-1000", label: "1.000 TL altı", min: 0, max: 99_999 },
  { value: "1000-1150", label: "1.000 – 1.150 TL", min: 100_000, max: 115_000 },
  { value: "1150-", label: "1.150 TL ve üzeri", min: 115_000, max: undefined },
] as const;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Ölçü URL'de "70x175", veride "70×175". */
export function sizeToParam(size: string): string {
  return size.replace("×", "x").toLowerCase();
}

export function parseFilterParams(sp: FilterSearchParams, sizes: readonly string[]): ProductFilter {
  const tip = productTypeSchema.safeParse(one(sp.tip));
  const sirala = sortKeySchema.safeParse(one(sp.sirala));
  const olcu = one(sp.olcu);
  const fiyat = PRICE_RANGES.find((r) => r.value === one(sp.fiyat));
  const sanatci = one(sp.sanatci);
  return {
    type: tip.success ? tip.data : undefined,
    artist: sanatci && /^[a-z0-9-]+$/.test(sanatci) ? sanatci : undefined,
    size: olcu ? sizes.find((s) => sizeToParam(s) === olcu) : undefined,
    minPriceKurus: fiyat?.min,
    maxPriceKurus: fiyat?.max,
    inStockOnly: one(sp.stok) === "1",
    sort: sirala.success ? sirala.data : "yeni",
  };
}

export function activeFilterCount(sp: FilterSearchParams): number {
  return ["tip", "sanatci", "olcu", "fiyat", "stok"].filter((k) => one(sp[k])).length;
}
