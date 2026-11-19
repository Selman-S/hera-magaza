/**
 * Faz 1 JSON verisini veritabanına aktarır. Tekrar çalıştırılabilir: var olan kayıtlara dokunmaz
 * (yönetim panelinde yapılan değişiklikler korunur).
 */
import { sql } from "drizzle-orm";
import collectionsJson from "@/content/collections.json";
import productsJson from "@/content/products.json";
import { parseCatalog } from "@/lib/data/schema";
import { DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";
import type { DbOrTx } from "./index";
import * as s from "./schema";

function parseSize(label: string): { widthCm: number | null; lengthCm: number | null } {
  const m = label.match(/^(\d+)×(\d+)$/);
  return m ? { widthCm: Number(m[1]), lengthCm: Number(m[2]) } : { widthCm: null, lengthCm: null };
}

export async function seedDatabase(db: DbOrTx, options: { log?: (msg: string) => void } = {}) {
  const log = options.log ?? (() => {});
  const { products, collections } = parseCatalog(productsJson, collectionsJson);

  let inserted = 0;
  for (const p of products) {
    const rows = await db
      .insert(s.products)
      .values({
        id: p.id,
        slug: p.slug,
        name: p.name,
        type: p.type,
        status: "active",
        artistName: p.artist?.name ?? null,
        artistSlug: p.artist?.slug ?? null,
        artworkTitle: p.artwork?.title ?? null,
        artworkYear: p.artwork?.year ?? null,
        artworkStory: p.artwork?.story ?? null,
        fabric: p.fabric,
        sizeLabel: p.size,
        ...parseSize(p.size),
        priceKurus: p.priceKurus,
        compareAtKurus: p.compareAtPriceKurus ?? null,
        trendyolPriceKurus: p.priceKurus,
        stock: p.stock,
        sku: p.id.toUpperCase(),
        trendyolProductId: p.trendyolId,
        colors: p.colors,
        description: p.description,
        careText: p.care,
        isNew: p.isNew,
        createdAt: new Date(`${p.createdAt}T09:00:00+03:00`),
      })
      .onConflictDoNothing({ target: s.products.id })
      .returning({ id: s.products.id });
    if (rows.length === 0) continue;
    inserted++;
    await db.insert(s.productImages).values(
      p.images.map((im, position) => ({ productId: p.id, url: im.src, alt: im.alt, width: im.width, height: im.height, position })),
    );
    if (p.stock > 0) {
      await db.insert(s.inventoryMovements).values({ productId: p.id, delta: p.stock, reason: "seed", actor: "seed" });
    }
  }
  log(`ürün: ${inserted} yeni / ${products.length}`);

  for (const [position, c] of collections.entries()) {
    const [row] = await db
      .insert(s.collections)
      .values({
        slug: c.slug,
        name: c.title,
        kicker: c.kicker,
        description: c.description,
        rule: c.rule,
        featured: c.featured,
        coverProductId: products.find((p) => p.slug === c.coverProduct)?.id ?? null,
        position,
      })
      .onConflictDoNothing({ target: s.collections.slug })
      .returning({ id: s.collections.id });
    if (!row) continue;
    const members = products.filter((p) => p.collections.includes(c.slug));
    if (c.rule === "manual" && members.length > 0) {
      await db
        .insert(s.productCollections)
        .values(members.map((p) => ({ productId: p.id, collectionId: row.id })))
        .onConflictDoNothing();
    }
  }
  log(`koleksiyon: ${collections.length}`);

  await db.insert(s.settings).values({ key: "store", value: DEFAULT_STORE_SETTINGS }).onConflictDoNothing();
  await db
    .insert(s.coupons)
    .values({ code: "HOSGELDIN10", label: "Hoş geldin indirimi %10", type: "percent", value: 10 })
    .onConflictDoNothing();
  log("ayarlar ve HOSGELDIN10 kuponu hazır");

  // Sipariş numarası sırası mevcut siparişlerin gerisinde kalmasın.
  await db.execute(sql`SELECT setval('order_no_seq', GREATEST((SELECT count(*) FROM orders), 1), (SELECT count(*) FROM orders) > 0)`);
}
