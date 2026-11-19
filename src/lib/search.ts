import { slugify } from "./slugify";

/** Aramada boşluk ve tirelerin önemi yok: "Van Gogh", "van-gogh", "vangogh" aynı. */
export function compact(input: string): string {
  return slugify(input).replace(/-/g, "");
}

export type Searchable = { haystack: string };

/** Ürün alanlarından tek bir aranabilir metin üretir. */
export function buildHaystack(parts: ReadonlyArray<string | null | undefined>): string {
  return parts
    .filter((p): p is string => Boolean(p))
    .map(compact)
    .join("|");
}

/**
 * Sorgu tamamı bitişik olarak geçiyorsa veya her kelimesi ayrı ayrı geçiyorsa eşleşir.
 * Boş sorgu eşleşmez.
 */
export function matches(haystack: string, query: string): boolean {
  const whole = compact(query);
  if (!whole) return false;
  if (haystack.includes(whole)) return true;
  const tokens = slugify(query).split("-").filter(Boolean);
  return tokens.length > 1 && tokens.every((t) => haystack.includes(t));
}
