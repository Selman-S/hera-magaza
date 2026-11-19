import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCollections } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Koleksiyonlar",
  description: "Van Gogh, Klimt, Hint ipeği, şallar, eşarplar ve hediye seçkisi.",
};

export default async function CollectionsPage() {
  const collections = (await getCollections()).filter((c) => c.slug !== "tumu");
  return (
    <div className="container-shop pt-6 lg:pt-10">
      <header className="pb-10 lg:pb-14">
        <p className="kicker mb-3">Sergi planı</p>
        <h1 className="font-serif text-4xl font-light lg:text-[3.5rem] lg:leading-none">Koleksiyonlar</h1>
      </header>
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c, i) => (
          <li key={c.slug} className={i % 3 === 1 ? "lg:mt-16" : undefined}>
            <Link href={`/koleksiyon/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-placeholder">
                <Image
                  src={c.cover.src}
                  alt={c.cover.alt}
                  fill
                  loading={i < 3 ? "eager" : "lazy"}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-gallery)] group-hover:scale-[1.03]"
                />
              </div>
              <div className="museum-label mt-4">
                <span className="text-ink-muted">{c.kicker}</span>
                <h2 className="font-serif text-2xl">{c.title}</h2>
                <span className="text-ink-muted">{c.productCount} eser</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
