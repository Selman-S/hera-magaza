import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderLookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "Sipariş sorgula", robots: { index: false } };

export default function OrderLookupPage() {
  return (
    <div className="container-shop grid gap-10 pt-6 lg:grid-cols-12 lg:gap-6 lg:pt-12">
      <div className="lg:col-span-5">
        <h1 className="font-serif text-4xl font-light lg:text-[3.5rem] lg:leading-none">Sipariş sorgula</h1>
        <p className="mt-5 max-w-[40ch] text-ink-muted">
          Sipariş numaranız (HR-2026-00001 gibi) sipariş onay e-postasında yazar. Siparişte kullandığınız e-posta adresiyle birlikte girin.
        </p>
      </div>
      <div className="lg:col-span-5 lg:col-start-8">
        <Suspense>
          <OrderLookupForm />
        </Suspense>
      </div>
    </div>
  );
}
