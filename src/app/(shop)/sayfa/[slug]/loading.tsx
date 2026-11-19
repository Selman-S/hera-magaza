import { Skeleton } from "@/components/ui/skeleton";

export default function ContentLoading() {
  return (
    <div className="container-shop flex flex-col gap-4 pt-6 lg:pt-12" role="status" aria-label="Sayfa yükleniyor">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-4 w-full max-w-2xl" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-full max-w-2xl" />
    </div>
  );
}
