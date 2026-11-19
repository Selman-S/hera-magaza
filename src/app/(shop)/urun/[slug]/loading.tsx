import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="container-shop pt-3 pb-8 lg:pt-6" role="status" aria-label="Ürün yükleniyor">
      <Skeleton className="mb-6 h-3 w-48" />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-7 lg:grid lg:grid-cols-[4.5rem_1fr] lg:gap-4">
          <div className="hidden flex-col gap-2 lg:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
          <Skeleton className="-mx-[var(--spacing-gutter)] aspect-[4/5] lg:mx-0" />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4 lg:col-start-9">
          <Skeleton className="h-10 w-11/12" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
