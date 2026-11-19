import type { Metadata } from "next";
import { CartPageClient } from "./cart-page-client";

export const metadata: Metadata = { title: "Sepet", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-shop pt-6 lg:pt-10">
      <h1 className="mb-8 font-serif text-4xl font-light lg:mb-12 lg:text-[3.5rem] lg:leading-none">Sepetiniz</h1>
      <CartPageClient />
    </div>
  );
}
