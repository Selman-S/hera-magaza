import { formatTRY } from "@/lib/money";
import { cx } from "@/lib/cx";

/** İndirimli fiyat önce, eski fiyat üstü çizili ve soluk. */
export function Price({
  priceKurus,
  compareAtPriceKurus,
  className,
}: {
  priceKurus: number;
  compareAtPriceKurus?: number;
  className?: string;
}) {
  const onSale = compareAtPriceKurus !== undefined && compareAtPriceKurus > priceKurus;
  return (
    <span className={cx("inline-flex items-baseline gap-2", className)}>
      <span className={cx("font-medium", onSale && "text-sale")}>
        {onSale && <span className="sr-only">İndirimli fiyat: </span>}
        {formatTRY(priceKurus)}
      </span>
      {onSale && (
        <s className="text-[0.85em] text-ink-muted">
          <span className="sr-only">Eski fiyat: </span>
          {formatTRY(compareAtPriceKurus)}
        </s>
      )}
    </span>
  );
}
