import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { cx } from "@/lib/cx";
import type { ProductSummary } from "@/lib/data/schema";

export function stockBadge(stock: number) {
  if (stock <= 0) return <Badge tone="soldout">Tükendi</Badge>;
  if (stock === 1) return <Badge tone="low">Son 1 adet</Badge>;
  return null;
}

/** Ürün adını "Sanatçı *Eser* Kumaş Tip Ölçü" biçiminde, eser adı italik gösterir. */
export function ProductName({ name }: { name: string }) {
  const m = name.match(/^(Van Gogh|Klimt) (.+?) ((?:Hint )?İpe(?:k|ği) (?:Şal|Eşarp).*)$/);
  if (!m) return <>{name}</>;
  return (
    <>
      {m[1]} <i>{m[2]}</i> {m[3]}
    </>
  );
}

/** Kart başlığı: sanatçı ve ölçü üst satırda yazdığı için çıkarılır; eser adı italik. "Badem Çiçeği Hint İpeği Şal – Turkuaz" */
export function ShortName({ name, hasArtist }: { name: string; hasArtist: boolean }) {
  const withoutSize = name.replace(/ \d+×\d+/, "");
  const m = hasArtist ? withoutSize.match(/^(?:Van Gogh|Klimt) (.+?) ((?:Hint )?İpe(?:k|ği) (?:Şal|Eşarp).*)$/) : null;
  if (!m) return <>{withoutSize}</>;
  return (
    <>
      <i>{m[1]}</i> {m[2]}
    </>
  );
}

export function ProductCard({
  product,
  index = 0,
  sizes = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw",
  className,
}: {
  product: ProductSummary;
  index?: number;
  sizes?: string;
  className?: string;
}) {
  const [first, second] = product.images;
  const soldOut = product.stock <= 0;
  return (
    <Link href={`/urun/${product.slug}`} data-item-id={product.id} className={cx("group flex flex-col", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-placeholder">
        <Image
          src={first.src}
          alt={first.alt}
          fill
          sizes={sizes}
          loading={index < 4 ? "eager" : "lazy"}
          className={cx(
            "object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-gallery)]",
            second ? "group-hover:opacity-0" : "group-hover:scale-[1.03]",
            soldOut && "opacity-60 grayscale-[35%]",
          )}
        />
        {second && (
          <Image
            src={second.src}
            alt=""
            aria-hidden
            fill
            sizes={sizes}
            className="object-cover opacity-0 transition-opacity duration-700 ease-[var(--ease-gallery)] group-hover:opacity-100"
          />
        )}
        {product.isNew && !soldOut && (
          <span className="absolute top-2.5 left-2.5">
            <Badge tone="new">Yeni</Badge>
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <p className="text-[0.6875rem] tracking-[0.08em] text-ink-muted uppercase">
          {product.artist ? <span lang="en">{product.artist.name}</span> : product.fabric}
          <span aria-hidden> · </span>
          {product.size}
        </p>
        <h3 className="line-clamp-2 font-serif text-[1.0625rem] leading-snug lg:text-lg">
          <span className="sr-only">{product.name}</span>
          <span aria-hidden>
            <ShortName name={product.name} hasArtist={Boolean(product.artist)} />
          </span>
        </h3>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Price priceKurus={product.priceKurus} compareAtPriceKurus={product.compareAtPriceKurus} />
          <span className="text-[0.6875rem] tracking-[0.06em] text-ink-muted uppercase">{product.fabric === "%100 pamuk" ? "Pamuk" : "İpek"}</span>
          {stockBadge(product.stock)}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, className }: { products: ProductSummary[]; className?: string }) {
  return (
    <ul className={cx("grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14", className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} index={i} />
        </li>
      ))}
    </ul>
  );
}
