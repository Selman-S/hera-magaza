import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { ARTISTS } from "@/lib/admin/products";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Yeni ürün" };

export default async function NewProductPage() {
  await requireAdmin();
  const collections = await getDb().select().from(s.collections).orderBy(asc(s.collections.position));
  return (
    <>
      <PageHeader kicker="Ürünler" title="Yeni ürün" />
      <p className="mb-6 text-sm text-ink-muted">
        Ürün önce taslak olarak oluşturulur; görselleri ekledikten sonra durumu “Yayında” yapın. Görseli olmayan ürün sitede görünmez.
      </p>
      <ProductForm
        artists={ARTISTS}
        collections={collections}
        defaults={{
          name: "",
          slug: "",
          type: "sal",
          status: "draft",
          artistSlug: "",
          artworkTitle: "",
          artworkYear: "",
          artworkStory: "",
          fabric: "İpek",
          sizeLabel: "70×180",
          price: "",
          compareAt: "",
          trendyolPrice: "",
          stock: "1",
          sku: "",
          barcode: "",
          trendyolProductId: "",
          colors: "",
          description: "",
          careText: "Kuru temizleme önerilir. Gerekirse soğuk suda, ipek şampuanıyla elde yıkayın; ovmayın, sıkmayın. Gölgede kurutun, düşük ısıda ters yüzünden ütüleyin.",
          isNew: true,
          collectionIds: [],
        }}
      />
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
