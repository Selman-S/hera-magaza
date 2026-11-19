import { z } from "zod";

const kurus = z.number().int().nonnegative();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Geçersiz slug");

export const productTypeSchema = z.enum(["sal", "esarp", "pareo"]);
export type ProductType = z.infer<typeof productTypeSchema>;

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  sal: "Şal",
  esarp: "Eşarp",
  pareo: "Pareo",
};

export const imageSchema = z.object({
  src: z.string().startsWith("/urunler/"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(5),
});
export type ProductImage = z.infer<typeof imageSchema>;

export const artistSchema = z.object({ name: z.string().min(2), slug });
export type Artist = z.infer<typeof artistSchema>;

export const artworkSchema = z.object({
  title: z.string().min(2),
  year: z.string().min(4),
  story: z.string().min(20),
});
export type Artwork = z.infer<typeof artworkSchema>;

export const productSchema = z
  .object({
    id: z.string().regex(/^hr-\d{3}$/),
    trendyolId: z.string().regex(/^\d+$/).nullable(),
    slug,
    name: z.string().min(5),
    type: productTypeSchema,
    artist: artistSchema.nullable(),
    artwork: artworkSchema.nullable(),
    fabric: z.string().min(2),
    size: z.string().min(2),
    priceKurus: kurus.positive(),
    compareAtPriceKurus: kurus.optional(),
    stock: z.number().int().nonnegative(),
    colors: z.array(z.string().min(2)),
    images: z.array(imageSchema).min(1),
    description: z.string().min(20),
    care: z.string().min(10),
    collections: z.array(slug),
    isNew: z.boolean(),
    createdAt: z.iso.date(),
  })
  .refine((p) => p.compareAtPriceKurus === undefined || p.compareAtPriceKurus > p.priceKurus, {
    message: "İndirimsiz fiyat, satış fiyatından büyük olmalı",
    path: ["compareAtPriceKurus"],
  });
export type Product = z.infer<typeof productSchema>;

export const collectionSchema = z.object({
  slug,
  title: z.string().min(2),
  kicker: z.string().min(2),
  description: z.string().min(10),
  rule: z.enum(["all", "manual"]),
  featured: z.boolean(),
  coverProduct: slug,
});
export type CollectionRecord = z.infer<typeof collectionSchema>;

/** Liste ve kartlarda kullanılan hafif ürün görünümü. */
export type ProductSummary = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "type"
  | "artist"
  | "fabric"
  | "size"
  | "priceKurus"
  | "compareAtPriceKurus"
  | "stock"
  | "isNew"
  | "createdAt"
> & { images: ProductImage[] };

/** Ürün detay sayfasının ihtiyaç duyduğu tam görünüm. */
export type ProductDetail = Product;

export type Collection = CollectionRecord & { productCount: number; cover: ProductImage };

export const sortKeySchema = z.enum(["yeni", "fiyat-artan", "fiyat-azalan"]);
export type SortKey = z.infer<typeof sortKeySchema>;

export type ProductFilter = {
  collection?: string;
  type?: ProductType;
  artist?: string;
  size?: string;
  minPriceKurus?: number;
  maxPriceKurus?: number;
  inStockOnly?: boolean;
  sort?: SortKey;
};

export function parseCatalog(products: unknown, collections: unknown) {
  const parsedProducts = z.array(productSchema).parse(products);
  const parsedCollections = z.array(collectionSchema).parse(collections);

  const seen = new Set<string>();
  for (const p of parsedProducts) {
    if (seen.has(p.slug)) throw new Error(`Aynı slug iki kez kullanılmış: ${p.slug}`);
    seen.add(p.slug);
  }
  const collectionSlugs = new Set(parsedCollections.map((c) => c.slug));
  for (const p of parsedProducts) {
    for (const c of p.collections) {
      if (!collectionSlugs.has(c)) throw new Error(`${p.slug}: bilinmeyen koleksiyon "${c}"`);
    }
  }
  for (const c of parsedCollections) {
    if (!seen.has(c.coverProduct)) throw new Error(`${c.slug}: kapak ürünü bulunamadı "${c.coverProduct}"`);
  }
  return { products: parsedProducts, collections: parsedCollections };
}
