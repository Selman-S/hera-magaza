import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unsign } from "@/lib/auth/sign";
import { ORDER_COOKIE } from "@/lib/checkout/order";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { mockPaymentsAllowed } from "@/lib/integrations/config";
import { getPaytrToken } from "@/lib/integrations/paytr";
import { formatTRY } from "@/lib/money";
import { siteUrl } from "@/lib/site-url";
import { MockPayment } from "./mock-payment";

export const metadata: Metadata = { title: "Kartla ödeme", robots: { index: false } };

export default function CardPaymentPage({ params }: PageProps<"/odeme/kart/[no]">) {
  return (
    <div className="container-shop pt-6 lg:pt-10">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-2xl" />}>
        {params.then(({ no }) => (
          <CardPayment no={decodeURIComponent(no)} />
        ))}
      </Suspense>
    </div>
  );
}

async function CardPayment({ no }: { no: string }) {
  if (unsign((await cookies()).get(ORDER_COOKIE)?.value, "order-view") !== no) {
    return <Notice title="Ödeme sayfası açılamadı" text="Bu sipariş bu tarayıcıdan verilmemiş. Sipariş sorgulama sayfasından devam edin." href="/siparis-sorgula" cta="Sipariş sorgula" />;
  }
  const db = getDb();
  const [order] = await db.select().from(s.orders).where(eq(s.orders.orderNo, no)).limit(1);
  if (!order) return <Notice title="Sipariş bulunamadı" text="" href="/" cta="Anasayfa" />;
  if (order.status !== "pending_payment") {
    return <Notice title="Bu siparişin ödemesi bekleniyor değil" text="Sipariş durumunu sipariş sayfanızdan görebilirsiniz." href={`/siparis/${no}`} cta="Siparişe git" />;
  }
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id)).orderBy(asc(s.orderItems.id));
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "127.0.0.1";
  const base = siteUrl();
  const token = await getPaytrToken({
    orderNo: order.orderNo,
    email: order.email,
    totalKurus: order.totalKurus,
    userIp: ip,
    userName: order.shippingAddress.fullName,
    userAddress: `${order.shippingAddress.line} ${order.shippingAddress.district}/${order.shippingAddress.city}`,
    userPhone: `0${order.phone}`,
    // PayTR'nin kendi sepeti; indirim/kargo/hediye paketi farkı toplam üzerinden tahsil edilir.
    items: items.map((i) => ({ name: i.nameSnapshot, unitPriceKurus: i.priceKurusSnapshot, quantity: i.quantity })),
    okUrl: `${base}/siparis/${order.orderNo}?odeme=tamam`,
    failUrl: `${base}/odeme/kart/${order.orderNo}?odeme=hata`,
  });

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-7">
        <p className="kicker mb-3">Sipariş {order.orderNo}</p>
        <h1 className="font-serif text-4xl font-light">Kartla ödeme</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Kart bilgileriniz Hera’ya ulaşmaz; ödeme PayTR güvenli ödeme sayfasında alınır. Ödenecek tutar: <strong className="font-medium text-ink">{formatTRY(order.totalKurus)}</strong>
        </p>
        <div className="mt-6">
          {!token.ok ? (
            <p role="alert" className="border-l-2 border-error bg-surface px-4 py-3 text-sm">
              Ödeme sayfası şu an açılamadı ({token.reason}). Birkaç dakika sonra tekrar deneyin ya da WhatsApp’tan bize yazın.
            </p>
          ) : token.mode === "live" ? (
            <>
              <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
              <iframe src={token.iframeUrl} id="paytriframe" title="PayTR güvenli ödeme" className="min-h-[600px] w-full border-0" />
              <Script id="paytr-resize" strategy="afterInteractive">{`if(window.iFrameResize){iFrameResize({},'#paytriframe')}`}</Script>
            </>
          ) : mockPaymentsAllowed() ? (
            <MockPayment orderNo={order.orderNo} />
          ) : (
            <p role="alert" className="text-sm text-error">Kartla ödeme şu an kullanılamıyor.</p>
          )}
        </div>
      </div>
      <aside className="bg-surface p-6 lg:col-span-4 lg:col-start-9" aria-label="Sipariş özeti">
        <h2 className="mb-4 font-serif text-2xl font-light">Özet</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>
                {i.nameSnapshot} {i.quantity > 1 && `× ${i.quantity}`}
              </span>
              <span className="tabular-nums">{formatTRY(i.priceKurusSnapshot * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-line pt-3 font-medium">
          <span>Toplam</span>
          <span className="tabular-nums">{formatTRY(order.totalKurus)}</span>
        </p>
      </aside>
    </div>
  );
}

function Notice({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl font-light">{title}</h1>
      {text && <p className="mt-4 text-ink-muted">{text}</p>}
      <ButtonLink href={href} className="mt-8">
        {cta}
      </ButtonLink>
    </div>
  );
}
