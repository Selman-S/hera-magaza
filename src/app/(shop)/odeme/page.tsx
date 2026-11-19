import type { Metadata } from "next";
import { getContentPage } from "@/lib/data/content";
import { CheckoutClient } from "./checkout-client";

export const metadata: Metadata = { title: "Ödeme", robots: { index: false } };

export default async function CheckoutPage() {
  const [preInfo, distance] = await Promise.all([
    getContentPage("on-bilgilendirme-formu"),
    getContentPage("mesafeli-satis-sozlesmesi"),
  ]);
  return (
    <div className="container-shop pt-6 lg:pt-10">
      <h1 className="mb-8 font-serif text-4xl font-light lg:mb-10 lg:text-[3.5rem] lg:leading-none">Ödeme</h1>
      <CheckoutClient preInfoHtml={preInfo?.html ?? ""} distanceSaleHtml={distance?.html ?? ""} />
    </div>
  );
}
