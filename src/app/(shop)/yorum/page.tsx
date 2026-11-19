import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { unsign } from "@/lib/auth/sign";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Yorum yazın", robots: { index: false } };

export default function ReviewPage({ searchParams }: PageProps<"/yorum">) {
  return (
    <div className="container-shop pt-6 lg:pt-12">
      <Suspense fallback={<Skeleton className="h-64 max-w-2xl" />}>
        {searchParams.then((sp) => (
          <ReviewContent token={typeof sp.anahtar === "string" ? sp.anahtar : ""} />
        ))}
      </Suspense>
    </div>
  );
}

async function ReviewContent({ token }: { token: string }) {
  const orderNo = unsign(token, "review");
  const db = getDb();
  const [order] = orderNo
    ? await db.select({ id: s.orders.id, status: s.orders.status, name: s.orders.shippingAddress }).from(s.orders).where(eq(s.orders.orderNo, orderNo))
    : [];
  if (!order) {
    return <Message title="Bağlantı geçersiz" text="Yorum bağlantısı hatalı ya da eksik. E-postadaki bağlantıyı yeniden açmayı deneyin." />;
  }
  if (order.status !== "delivered") {
    return <Message title="Henüz erken" text="Yorumunuzu sipariş elinize ulaştıktan sonra yazabilirsiniz." />;
  }
  const items = await db
    .select({ productId: s.orderItems.productId, name: s.orderItems.nameSnapshot, image: s.orderItems.imageSnapshot, reviewId: s.reviews.id })
    .from(s.orderItems)
    .leftJoin(s.reviews, and(eq(s.reviews.orderId, s.orderItems.orderId), eq(s.reviews.productId, s.orderItems.productId)))
    .where(eq(s.orderItems.orderId, order.id));
  const firstName = order.name.fullName.split(" ")[0] ?? "";
  return (
    <div className="max-w-2xl">
      <p className="kicker mb-3">Sipariş {orderNo}</p>
      <h1 className="font-serif text-4xl font-light">Nasıl buldunuz?</h1>
      <p className="mt-4 text-ink-muted">Yorumunuz onaylandıktan sonra ürün sayfasında “doğrulanmış alıcı” olarak görünür.</p>
      <ul className="mt-8 flex flex-col gap-8">
        {items
          .filter((i) => i.productId)
          .map((i) => (
            <li key={i.productId}>
              <ReviewForm token={token} productId={i.productId!} productName={i.name} image={i.image} done={Boolean(i.reviewId)} defaultName={firstName} />
            </li>
          ))}
      </ul>
    </div>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl font-light">{title}</h1>
      <p className="mt-4 text-ink-muted">{text}</p>
    </div>
  );
}
