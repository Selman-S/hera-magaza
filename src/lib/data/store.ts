/** Mağaza ayarları ve onaylı yorumlar (vitrin, önbellekli). */
import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { parseStoreSettings, type StoreSettings } from "@/lib/store-settings";

export const SETTINGS_TAG = "settings";
export const REVIEWS_TAG = "reviews";

export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  const [row] = await getDb().select().from(s.settings).where(eq(s.settings.key, "store")).limit(1);
  return parseStoreSettings(row?.value);
}

export type PublicReview = {
  id: number;
  name: string;
  city: string | null;
  rating: number;
  text: string;
  productName: string;
  productSlug: string;
  createdAt: string;
};

export async function getApprovedReviews(options: { productId?: string; limit?: number } = {}): Promise<PublicReview[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(REVIEWS_TAG);
  const rows = await getDb()
    .select({
      id: s.reviews.id,
      name: s.reviews.name,
      city: s.reviews.city,
      rating: s.reviews.rating,
      text: s.reviews.text,
      productName: s.products.name,
      productSlug: s.products.slug,
      createdAt: s.reviews.createdAt,
    })
    .from(s.reviews)
    .innerJoin(s.products, eq(s.reviews.productId, s.products.id))
    .where(
      options.productId
        ? and(eq(s.reviews.status, "approved"), eq(s.reviews.productId, options.productId))
        : eq(s.reviews.status, "approved"),
    )
    .orderBy(desc(s.reviews.createdAt))
    .limit(options.limit ?? 12);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
