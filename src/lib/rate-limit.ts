/**
 * Basit kayan pencere hız sınırı (bellek içi, tek sunucu). Çok sunuculu yayında
 * (Vercel) paylaşımlı bir depoya taşınmalı — Faz 4 (docs/kararlar.md K-03).
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }, now = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return true;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
