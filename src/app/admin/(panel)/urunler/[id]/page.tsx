import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel, ProductStatusBadge, formatDateTime } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ARTISTS, getProductForAdmin } from "@/lib/admin/products";
import { kurusToInput } from "@/lib/admin/money-input";
import { ImageManager } from "../image-manager";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Ürün düzenle" };

const REASON = { seed: "İlk yükleme", order: "Sipariş", cancel: "İptal iadesi", manual: "Elle", trendyol_sale: "Trendyol satışı", return: "İade" } as const;

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/urunler/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const data = await getProductForAdmin(getDb(), id);
  if (!data) notFound();
  const { product: p, images, collections, collectionIds, movements } = data;

  return (
    <>
      <PageHeader
        kicker={`Ürünler · ${p.id.toUpperCase()}`}
        title={p.name}
        actions={
          <>
            <ProductStatusBadge status={p.status} />
            {p.status !== "draft" && (
              <Link href={`/urun/${p.slug}`} target="_blank" className={buttonClass("secondary", "sm")}>
                Sitede gör ↗
              </Link>
            )}
          </>
        }
      />
      {sp.kaydedildi && (
        <p role="status" className="mb-6 border-l-2 border-success bg-surface px-3 py-2 text-sm">
          Ürün oluşturuldu. Şimdi görsel ekleyin ve durumu “Yayında” yapın.
        </p>
      )}
      <Panel title="Görseller" className="mb-6">
        <ImageManager productId={p.id} productName={p.name} images={images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))} />
      </Panel>
      <ProductForm
        key={p.updatedAt.toISOString()}
        artists={ARTISTS}
        collections={collections}
        defaults={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          type: p.type,
          status: p.status,
          artistSlug: p.artistSlug ?? "",
          artworkTitle: p.artworkTitle ?? "",
          artworkYear: p.artworkYear ?? "",
          artworkStory: p.artworkStory ?? "",
          fabric: p.fabric,
          sizeLabel: p.sizeLabel,
          price: kurusToInput(p.priceKurus),
          compareAt: kurusToInput(p.compareAtKurus),
          trendyolPrice: kurusToInput(p.trendyolPriceKurus),
          stock: String(p.stock),
          sku: p.sku ?? "",
          barcode: p.barcode ?? "",
          trendyolProductId: p.trendyolProductId ?? "",
          colors: p.colors.join(", "),
          description: p.description,
          careText: p.careText,
          isNew: p.isNew,
          collectionIds,
        }}
      />
      <Panel title="Stok hareketleri (son 15)" className="mt-6">
        <ul className="flex flex-col divide-y divide-line text-sm">
          {movements.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 py-2">
              <span className="w-36 text-ink-muted tabular-nums">{formatDateTime(m.createdAt)}</span>
              <span className={`w-12 text-right font-medium tabular-nums ${m.delta < 0 ? "text-dot" : "text-success"}`}>
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </span>
              <span>{REASON[m.reason]}</span>
              <span className="text-ink-muted">
                {m.refId ?? ""} {m.actor ?? ""}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

/** Her istekte sunucuda çizilir (oturum + güncel veri). */
export const instant = false;
