import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderResult } from "./order-result";

export const metadata: Metadata = { title: "Siparişiniz alındı", robots: { index: false } };

export default function OrderPage({ params }: PageProps<"/siparis/[no]">) {
  return (
    <div className="container-shop pt-10 lg:pt-16">
      <Suspense fallback={<Skeleton className="h-64 w-full max-w-2xl" />}>
        {params.then(({ no }) => (
          <OrderResult no={decodeURIComponent(no)} />
        ))}
      </Suspense>
    </div>
  );
}
