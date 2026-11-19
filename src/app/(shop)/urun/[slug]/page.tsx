import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Gallery } from "@/components/shop/gallery";
import { ProductGrid, ProductName } from "@/components/shop/product-card";
import { PurchasePanel } from "@/components/shop/purchase-panel";
import { TrackViewItem } from "@/components/shop/analytics";
import { getAllProductSlugs, getProductBySlug, getProductRedirect, getRelatedProducts } from "@/lib/data/catalog";
import { getApprovedReviews, getStoreSettings } from "@/lib/data/store";
import { PRODUCT_TYPE_LABEL, type ProductDetail } from "@/lib/data/schema";
import { formatTRY } from "@/lib/money";
import { settings } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/urun/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Ürün bulunamadı" };
  return {
    title: p.name,
    description: `${p.description} ${p.fabric}, ${p.size} cm. ${formatTRY(p.priceKurus)}.`,
    alternates: { canonical: `/urun/${p.slug}` },
    openGraph: { images: [{ url: p.images[0].src, width: p.images[0].width, height: p.images[0].height, alt: p.images[0].alt }] },
  };
}

const ARTIST_LIFE: Record<string, string> = {
  "van-gogh": "Hollandalı, 1853–1890",
  klimt: "Avusturyalı, 1862–1918",
};

function productJsonLd(p: ProductDetail) {
  const site = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.id,
    description: p.description,
    image: p.images.map((i) => new URL(i.src, site).toString()),
    material: p.fabric,
    size: p.size,
    brand: { "@type": "Brand", name: settings.storeName },
    offers: {
      "@type": "Offer",
      url: new URL(`/urun/${p.slug}`, site).toString(),
      priceCurrency: "TRY",
      price: (p.priceKurus / 100).toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/urun/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    const moved = await getProductRedirect(slug);
    if (moved) permanentRedirect(`/urun/${moved}`);
    notFound();
  }
  const [related, store, reviews] = await Promise.all([
    getRelatedProducts(product.id, 4),
    getStoreSettings(),
    getApprovedReviews({ productId: product.id, limit: 10 }),
  ]);
  const typeLabel = PRODUCT_TYPE_LABEL[product.type];
  const listHref = product.type === "esarp" ? "/koleksiyon/esarplar" : product.type === "sal" ? "/koleksiyon/sallar" : "/koleksiyon/tumu";

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD: içerik kendi verimizden; "<" kaçışlanır.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, "\\u003c") }}
      />
      <TrackViewItem item={{ id: product.id, name: product.name, priceKurus: product.priceKurus, category: product.type, artist: product.artist?.name }} />
      <div className="container-shop pt-3 pb-8 lg:pt-6">
        <nav aria-label="Konum" className="mb-4 text-xs text-ink-muted lg:mb-6">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink">
                Anasayfa
              </Link>{" "}
              /
            </li>
            <li>
              <Link href={listHref} className="hover:text-ink">
                {product.type === "pareo" ? "Tüm ürünler" : `${typeLabel}lar`}
              </Link>
              {product.artist && " /"}
            </li>
            {product.artist && (
              <li>
                <Link href={`/koleksiyon/${product.artist.slug}`} className="hover:text-ink">
                  {product.artist.slug === "van-gogh" ? "Van Gogh" : product.artist.name.split(" ").pop()}
                </Link>
              </li>
            )}
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-7">
            <Gallery images={product.images} name={product.name} />
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-28">
              <h1 className="font-serif text-[2rem] leading-[1.08] font-light lg:text-4xl">
                <ProductName name={product.name} />
              </h1>
              <p className="mt-3 text-sm text-ink-muted">
                {product.fabric} {typeLabel.toLocaleLowerCase("tr")} · {product.size}
                {product.size !== "Standart" && " cm"}
              </p>
              <div className="mt-6">
                <PurchasePanel
                  product={{
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    priceKurus: product.priceKurus,
                    compareAtPriceKurus: product.compareAtPriceKurus,
                    stock: product.stock,
                    image: { src: product.images[0].src, alt: product.images[0].alt },
                  }}
                />
              </div>

              <ul className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center text-xs text-ink-muted">
                <li>
                  <span className="block font-medium text-ink">Güvenli ödeme</span>
                  Kart bilgisi bize ulaşmaz
                </li>
                <li>
                  <span className="block font-medium text-ink">{settings.returnDays} gün iade</span>
                  Koşulsuz
                </li>
                <li>
                  <span className="block font-medium text-ink">Hediye kutusu</span>
                  Her siparişte
                </li>
              </ul>

              <p className="mt-6 text-[0.9375rem] leading-relaxed">{product.description}</p>

              <Accordion className="mt-6">
                <AccordionItem title="Ürün özellikleri" defaultOpen name="urun-bilgi">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
                    <dt>Kumaş</dt>
                    <dd className="text-ink">{product.fabric}{product.fabric.includes("ipe") || product.fabric === "İpek" ? " (vual veya viskon değil)" : ""}</dd>
                    <dt>Ölçü</dt>
                    <dd className="text-ink">{product.size}{product.size !== "Standart" && " cm"}</dd>
                    <dt>Tür</dt>
                    <dd className="text-ink">{typeLabel}</dd>
                    <dt>Renkler</dt>
                    <dd className="text-ink">{product.colors.join(", ")}</dd>
                    <dt>Ürün kodu</dt>
                    <dd className="text-ink">{product.id.toUpperCase()}</dd>
                  </dl>
                </AccordionItem>
                <AccordionItem title="Bakım" name="urun-bilgi">
                  {product.care}
                </AccordionItem>
                <AccordionItem title="Kargo ve iade" name="urun-bilgi">
                  <p>
                    İzmir’den 1–3 iş gününde kargoya verilir. {formatTRY(store.freeShippingThresholdKurus)} ve üzeri siparişlerde
                    kargo ücretsizdir. Teslimattan itibaren {settings.returnDays} gün içinde koşulsuz iade edebilirsiniz.{" "}
                    <Link href="/sayfa/iade-ve-degisim" className="text-ink underline underline-offset-2">
                      Ayrıntılar
                    </Link>
                  </p>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      {product.artwork && product.artist && (
        <section aria-labelledby="eser-baslik" className="container-shop py-12 lg:py-20">
          <div className="grid gap-8 border-t border-line pt-10 lg:grid-cols-12 lg:gap-6">
            <p className="kicker lg:col-span-2">Eserin hikâyesi</p>
            <aside className="bg-surface p-6 lg:col-span-4 lg:col-start-3" aria-label="Eser künyesi">
              <p className="font-semibold">{product.artist.name}</p>
              <p className="text-sm text-ink-muted">{ARTIST_LIFE[product.artist.slug] ?? ""}</p>
              <h2 id="eser-baslik" className="mt-3 font-serif text-3xl italic">
                {product.artwork.title}
              </h2>
              <p className="text-sm text-ink-muted">{product.artwork.year}</p>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 border-t border-line pt-4 text-sm">
                <dt className="text-ink-muted">Kumaş</dt>
                <dd>{product.fabric}</dd>
                <dt className="text-ink-muted">Ölçü</dt>
                <dd>{product.size} cm</dd>
              </dl>
            </aside>
            <p className="font-serif text-xl leading-relaxed font-light lg:col-span-5 lg:col-start-8 lg:text-2xl">
              {product.artwork.story}
            </p>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section aria-labelledby="yorum-baslik" className="container-shop py-12">
          <div className="grid gap-8 border-t border-line pt-10 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-3">
              <h2 id="yorum-baslik" className="font-serif text-3xl font-light">
                Yorumlar
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {(reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} / 5 ·{" "}
                {reviews.length} doğrulanmış alıcı
              </p>
            </div>
            <ul className="flex flex-col gap-8 lg:col-span-8 lg:col-start-5">
              {reviews.map((r) => (
                <li key={r.id}>
                  <p aria-label={`${r.rating} / 5 yıldız`} className="text-sm tracking-[0.2em]">
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  <blockquote className="mt-2 font-serif text-xl leading-snug font-light">“{r.text}”</blockquote>
                  <p className="mt-2 text-sm text-ink-muted">
                    {r.name}
                    {r.city ? `, ${r.city}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="benzer-baslik" className="container-shop py-12">
          <h2 id="benzer-baslik" className="mb-8 border-t border-line pt-6 font-serif text-3xl font-light">
            Aynı salondan
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
