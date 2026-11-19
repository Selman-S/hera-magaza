import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/shop/product-card";
import { NewsletterForm } from "@/components/shop/newsletter-form";
import { IconArrow, IconInstagram } from "@/components/shop/icons";
import { getCollections, getModelShots, getProductBySlug, getProducts } from "@/lib/data/catalog";
import { getReviews } from "@/lib/data/content";
import { getApprovedReviews, getStoreSettings } from "@/lib/data/store";
import { formatTRY } from "@/lib/money";
import { settings } from "@/lib/settings";

const HERO_SLUG = "van-gogh-badem-cicegi-hint-ipegi-sal-70x175-turkuaz";

export default async function HomePage() {
  const [hero, collections, newArrivals, sampleReviews, instagram, store, realReviews] = await Promise.all([
    getProductBySlug(HERO_SLUG),
    getCollections(),
    getProducts({ collection: "yeni-gelenler", inStockOnly: true, sort: "yeni" }),
    getReviews(),
    getModelShots(6),
    getStoreSettings(),
    getApprovedReviews({ limit: 3 }),
  ]);
  // Gerçek (onaylı) yorum varsa onları, yoksa "örnek" etiketli taslakları göster.
  const reviews =
    realReviews.length > 0
      ? realReviews.map((r) => ({ id: String(r.id), author: r.name, city: r.city ?? "", product: r.productName, text: r.text, sample: false }))
      : sampleReviews;
  const showSampleLabel = realReviews.length === 0;
  const featured = collections.filter((c) => c.featured);
  // Şal ve eşarpları dönüşümlü diz: art arda aynı tür kart monoton duruyor.
  const shawls = newArrivals.filter((p) => p.type !== "esarp");
  const scarves = newArrivals.filter((p) => p.type === "esarp");
  const mixed = Array.from({ length: Math.max(shawls.length, scarves.length) }, (_, i) => [shawls[i], scarves[i]])
    .flat()
    .filter((p) => p !== undefined)
    .slice(0, 8);


  return (
    <>
      {/* KAPAK */}
      <section aria-labelledby="kapak-baslik" className="container-shop grid gap-8 pt-4 pb-16 lg:min-h-[calc(100svh-7.5rem)] lg:grid-cols-12 lg:items-end lg:gap-x-6 lg:pt-8 lg:pb-20">
        {hero && (
          <figure className="relative aspect-[4/5] overflow-hidden bg-placeholder lg:col-span-6 lg:col-start-2 lg:row-span-2 lg:aspect-auto lg:h-[min(78vh,780px)]">
            <Image
              src={hero.images[0].src}
              alt={hero.images[0].alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover object-[50%_35%]"
            />
          </figure>
        )}
        <div className="lg:col-span-4 lg:col-start-9 lg:self-start lg:pt-[8vh]">
          <p className="kicker mb-5">Kış sergisi · 2026</p>
          <h1 id="kapak-baslik" className="font-serif text-[2.75rem] leading-[1.02] font-light tracking-[-0.01em] lg:text-hero">
            Duvardan
            <br />
            <em>omuza.</em>
          </h1>
          <p className="mt-5 max-w-[34ch] text-ink-muted">
            Van Gogh’tan Klimt’e, sevdiğimiz tabloları ipeğe taşıyoruz. Her desenden yalnızca birkaç parça.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <ButtonLink href="/koleksiyon/tumu" size="lg">
              Koleksiyonu keşfet
            </ButtonLink>
            <ButtonLink href="/koleksiyon/hediye" variant="text">
              Hediye seçkisi
            </ButtonLink>
          </div>
        </div>
        {hero?.artwork && hero.artist && (
          <Link href={`/urun/${hero.slug}`} className="museum-label max-w-64 transition-opacity hover:opacity-70 lg:col-span-3 lg:col-start-9 lg:mb-1 lg:self-end">
            <b className="block font-semibold">{hero.artist.name}</b>
            <span className="text-ink-muted">Hollandalı, 1853–1890</span>
            <br />
            <span className="font-serif text-base italic">
              {hero.artwork.title}, {hero.artwork.year}
            </span>
            <br />
            <span className="text-ink-muted">
              {hero.fabric} şal · {hero.size} cm · {formatTRY(hero.priceKurus)}
            </span>
          </Link>
        )}
      </section>

      {/* ÖNE ÇIKAN KOLEKSİYONLAR */}
      <section aria-labelledby="koleksiyonlar-baslik" className="container-shop py-12 lg:py-20">
        <div className="mb-8 flex items-end justify-between gap-6 border-t border-line pt-6 lg:mb-12">
          <h2 id="koleksiyonlar-baslik" className="font-serif text-3xl font-light lg:text-4xl">
            Salonlar
          </h2>
          <Link href="/koleksiyonlar" className="text-sm underline-offset-4 hover:underline">
            Tüm koleksiyonlar
          </Link>
        </div>
        <ul className="grid gap-10 md:grid-cols-12 md:gap-6">
          {featured.map((c, i) => (
            <li
              key={c.slug}
              className={
                i === 0 ? "md:col-span-5" : i === 1 ? "md:col-span-4 md:col-start-7 md:mt-24" : "md:col-span-3 md:col-start-10 md:-mt-8"
              }
            >
              <Link href={`/koleksiyon/${c.slug}`} className="group block">
                <div className={`relative overflow-hidden bg-placeholder ${i === 0 ? "aspect-[4/5]" : "aspect-[3/4]"}`}>
                  <Image
                    src={c.cover.src}
                    alt={c.cover.alt}
                    fill
                    sizes="(min-width: 768px) 40vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-gallery)] group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="kicker">{c.kicker}</p>
                    <h3 className="mt-1 font-serif text-2xl">{c.title}</h3>
                    <p className="mt-1 max-w-[36ch] text-sm text-ink-muted">{c.description}</p>
                  </div>
                  <span className="mt-6 flex shrink-0 items-center gap-1.5 text-sm">
                    {c.productCount} eser <IconArrow className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* YENİ GELENLER */}
      <section aria-labelledby="yeni-baslik" className="container-shop py-12 lg:py-16">
        <div className="mb-8 flex items-end justify-between gap-6 border-t border-line pt-6 lg:mb-12">
          <div>
            <h2 id="yeni-baslik" className="font-serif text-3xl font-light lg:text-4xl">
              Yeni gelenler
            </h2>
            <p className="mt-2 text-sm text-ink-muted">Son eklenen desenler. Çoğundan yalnızca bir ya da iki tane var.</p>
          </div>
          <Link href="/koleksiyon/yeni-gelenler" className="shrink-0 text-sm underline-offset-4 hover:underline">
            Tümünü gör
          </Link>
        </div>
        <ProductGrid products={mixed} />
      </section>

      {/* NEDEN HERA */}
      <section aria-labelledby="neden-baslik" className="container-shop py-16 lg:py-24">
        <div className="grid gap-10 border-t border-line pt-10 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-4">
            <h2 id="neden-baslik" className="font-serif text-3xl font-light lg:text-4xl">
              Neden <em>Hera?</em>
            </h2>
            <p className="mt-4 max-w-[38ch] text-ink-muted">
              Küçük bir İzmir atölyesiyiz. Az desen seçer, her parçayı tek tek kontrol edip kendimiz paketleriz.
            </p>
          </div>
          <ol className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {[
              ["İpek", "Şallarımız ipek ve Hint ipeği; vual ya da viskon değil. Hafif, nefes alan, dökümlü."],
              ["Az ve özel", "Her desenden yalnızca birkaç parça var. Tükenen desen genellikle yeniden gelmez."],
              ["Hediye kutusunda", "Her sipariş hediye kutusunda gider. İsterseniz notunuzu elle yazıp ekleriz."],
              ["Hızlı kargo", `İzmir’den 1–3 iş gününde. ${formatTRY(store.freeShippingThresholdKurus)} üzeri kargo ücretsiz.`],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-5">
                <span aria-hidden className="font-serif text-4xl leading-none font-light text-ink-muted/60 italic">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-serif text-2xl">{title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* YORUMLAR */}
      <section aria-labelledby="yorum-baslik" className="bg-surface py-16 lg:py-24">
        <div className="container-shop">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 id="yorum-baslik" className="font-serif text-3xl font-light lg:text-4xl">
              Ziyaretçi defteri
            </h2>
            {showSampleLabel && (
              <span className="rounded-xs border border-dashed border-line px-2 py-1 text-[0.6875rem] tracking-[0.06em] text-ink-muted uppercase">
                Örnek yorumlar
              </span>
            )}
          </div>
          <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
            {reviews.map((r) => (
              <li key={r.id}>
                <figure className="flex h-full flex-col">
                  <blockquote className="font-serif text-xl leading-snug font-light italic lg:text-2xl">“{r.text}”</blockquote>
                  <figcaption className="museum-label mt-6">
                    <b className="font-semibold">{r.author}</b>, {r.city}
                    <br />
                    <span className="text-ink-muted">{r.product}</span>
                    {r.sample && <span className="sr-only"> (örnek yorum, gerçek müşteri yorumu değil)</span>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* INSTAGRAM */}
      <section aria-labelledby="ig-baslik" className="py-16 lg:py-24">
        <div className="container-shop mb-8 flex items-end justify-between gap-4">
          <h2 id="ig-baslik" className="font-serif text-3xl font-light lg:text-4xl">
            Omuzlarda
          </h2>
          <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm hover:underline">
            <IconInstagram className="size-4" /> {settings.instagramHandle}
          </a>
        </div>
        <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-[var(--spacing-gutter)] [scrollbar-width:none] md:grid md:grid-cols-6 md:overflow-visible md:px-8 xl:px-12">
          {instagram.map((p) => (
            <li key={p.slug} className="w-[42vw] shrink-0 snap-start md:w-auto">
              <Link href={`/urun/${p.slug}`} className="relative block aspect-square overflow-hidden bg-placeholder">
                <Image src={p.image.src} alt={p.image.alt} fill sizes="(min-width: 768px) 16vw, 42vw" className="object-cover transition-transform duration-700 hover:scale-105" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* E-BÜLTEN */}
      <section aria-label="E-bülten" className="container-shop">
        <div className="grid gap-8 border-t border-line pt-12 lg:grid-cols-12">
          <p className="max-w-[40ch] text-ink-muted lg:col-span-5">
            Yeni desenler genellikle birkaç gün içinde tükeniyor. Listeye katılın, yeni sergiyi herkesten önce görün.
          </p>
          <div className="lg:col-span-5 lg:col-start-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
