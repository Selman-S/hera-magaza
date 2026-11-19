import { cx } from "@/lib/cx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-xs bg-placeholder", className)} />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6" role="status" aria-label="Ürünler yükleniyor">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/5] w-full" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
