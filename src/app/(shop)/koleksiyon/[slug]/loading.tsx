import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function CollectionLoading() {
  return (
    <div className="container-shop pt-6 lg:pt-10">
      <div className="flex flex-col gap-4 pb-8 lg:pb-12">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-12 w-64" />
      </div>
      <Skeleton className="mb-8 h-12 w-full" />
      <ProductGridSkeleton />
    </div>
  );
}
