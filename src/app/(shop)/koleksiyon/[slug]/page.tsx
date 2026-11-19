import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/shop/filters";
import { ProductGrid } from "@/components/shop/product-card";
import {
  getAllCollectionSlugs,
  getCollectionBySlug,
  getFilterOptions,
  getProducts,
} from "@/lib/data/catalog";
import { activeFilterCount, parseFilterParams, type FilterSearchParams } from "@/lib/data/filter-params";

export async function generateStaticParams() {
  return (await getAllCollectionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/koleksiyon/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) return { title: "Koleksiyon bulunamadı" };
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: `/koleksiyon/${c.slug}` },
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/koleksiyon/[slug]">) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  return (
    <div className="container-shop pt-6 lg:pt-10">
      <header className="grid gap-4 pb-8 lg:grid-cols-12 lg:gap-6 lg:pb-12">
        <div className="lg:col-span-6">
          <p className="kicker mb-3">{collection.kicker}</p>
          <h1 className="font-serif text-4xl font-light lg:text-[3.5rem] lg:leading-none">{collection.title}</h1>
        </div>
        <p className="max-w-[48ch] text-ink-muted lg:col-span-5 lg:col-start-8 lg:self-end">{collection.description}</p>
      </header>
      <Suspense fallback={<ProductGridSkeleton />}>
        <Results slug={collection.slug} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ slug, searchParams }: { slug: string; searchParams: Promise<FilterSearchParams> }) {
  const sp = await searchParams;
  const options = await getFilterOptions(slug);
  const filter = parseFilterParams(sp, options.sizes);
  const products = await getProducts({ ...filter, collection: slug });
  const active = activeFilterCount(sp);

  return (
    <>
      <FilterBar options={options} total={products.length} activeCount={active} />
      <div className="mt-8">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="flex flex-col items-start gap-5 border border-dashed border-line px-6 py-14 lg:items-center lg:text-center">
            <p className="font-serif text-2xl font-light">
              {active > 0 ? "Bu seçimle eşleşen ürün yok." : "Bu salon şimdilik boş."}
            </p>
            <p className="max-w-[44ch] text-sm text-ink-muted">
              {active > 0
                ? "Filtrelerden birini kaldırmayı deneyin; birçok desen tek parça olduğu için seçenekler hızlı değişiyor."
                : "Yeni desenler hazırlanıyor. Bu arada diğer koleksiyonlara göz atabilirsiniz."}
            </p>
            {active > 0 ? (
              <ButtonLink href={`/koleksiyon/${slug}`} variant="secondary">
                Filtreleri temizle
              </ButtonLink>
            ) : (
              <ButtonLink href="/koleksiyon/tumu">Tüm ürünler</ButtonLink>
            )}
          </div>
        )}
      </div>
      <p className="mt-12 text-center text-sm text-ink-muted">
        Aradığınızı bulamadınız mı?{" "}
        <Link href="/sayfa/iletisim" className="text-ink underline underline-offset-2">
          Bize yazın
        </Link>
        ; yeni gelecek desenleri söyleyelim.
      </p>
    </>
  );
}
