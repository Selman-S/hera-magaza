import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { unsign } from "@/lib/auth/sign";
import { ORDER_COOKIE } from "@/lib/checkout/order";
import { getOrderForCustomer } from "@/lib/data/orders";
import { formatTRY } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { whatsappLink } from "@/lib/settings";

export const metadata: Metadata = { title: "Siparişiniz", robots: { index: false } };

const PAYMENT_LABEL = { kart: "Kredi / banka kartı", havale: "Havale / EFT", kapida: "Kapıda ödeme" } as const;

export default function OrderPage({ params }: PageProps<"/siparis/[no]">) {
  return (
    <div className="container-shop pt-10 lg:pt-16">
      <Suspense fallback={<Skeleton className="h-64 w-full max-w-2xl" />}>
        {params.then(({ no }) => (
          <OrderView no={decodeURIComponent(no).toUpperCase()} />
        ))}
      </Suspense>
    </div>
  );
}

async function OrderView({ no }: { no: string }) {
  // Sipariş ayrıntısı yalnızca siparişi veren tarayıcıya (veya sipariş sorgulamada e-postayı doğrulayana) gösterilir.
  const allowed = unsign((await cookies()).get(ORDER_COOKIE)?.value, "order-view") === no;
  const data = allowed ? await getOrderForCustomer(no) : null;

  if (!data) {
    return (
      <div className="max-w-xl">
        <p className="kicker mb-4">Sipariş no · {no}</p>
        <h1 className="font-serif text-4xl font-light">Siparişinizi görüntüleyin</h1>
        <p className="mt-5 text-ink-muted">Güvenliğiniz için sipariş ayrıntılarını görmek üzere sipariş numaranızı ve e-posta adresinizi doğrulayın.</p>
        <ButtonLink href={`/siparis-sorgula?no=${encodeURIComponent(no)}`} className="mt-8">
          Sipariş sorgula
        </ButtonLink>
      </div>
    );
  }

  const { order, items, shipments } = data;
  const isNew = order.status === "pending_payment";
  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-6">
        <p className="kicker mb-4">Sipariş no · {order.orderNo}</p>
        <h1 className="font-serif text-4xl font-light lg:text-[3.5rem] lg:leading-none">
          {isNew ? (
            <>
              Teşekkürler.
              <br />
              <em>Siparişiniz alındı.</em>
            </>
          ) : (
            <>Siparişiniz</>
          )}
        </h1>
        <dl className="mt-8 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-ink-muted">Durum</dt>
          <dd className="font-medium">{ORDER_STATUS_LABEL[order.status]}</dd>
          <dt className="text-ink-muted">Ödeme</dt>
          <dd>{PAYMENT_LABEL[order.paymentMethod]}</dd>
          <dt className="text-ink-muted">E-posta</dt>
          <dd>{order.email}</dd>
          <dt className="text-ink-muted">Teslimat</dt>
          <dd>
            {order.shippingAddress.fullName}, {order.shippingAddress.district} / {order.shippingAddress.city}
          </dd>
          {shipments[0] && (
            <>
              <dt className="text-ink-muted">Kargo</dt>
              <dd>
                {shipments[0].carrier} · {shipments[0].trackingNo}
              </dd>
            </>
          )}
        </dl>
        {isNew && (
          <p className="mt-6 max-w-[46ch] border-l-2 border-ink bg-surface px-4 py-3 text-sm">
            {order.paymentMethod === "havale"
              ? `Havale/EFT bilgileri e-postanıza gönderilecek. Açıklamaya sipariş numaranızı (${order.orderNo}) yazın.`
              : "Online ödeme adımı yakında açılacak (Faz 3). Siparişiniz şu an ödeme bekliyor olarak kayıtlı."}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/koleksiyon/yeni-gelenler">Alışverişe devam et</ButtonLink>
          <ButtonLink
            href={whatsappLink(`Merhaba, ${order.orderNo} numaralı siparişim hakkında yazıyorum.`)}
            variant="secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp’tan yazın
          </ButtonLink>
        </div>
      </div>
      <aside aria-label="Sipariş özeti" className="bg-surface p-6 lg:col-span-4 lg:col-start-9">
        <h2 className="mb-5 font-serif text-2xl font-light">Özet</h2>
        <ul className="flex flex-col gap-4">
          {items.map((l) => (
            <li key={l.id} className="flex items-center gap-4">
              <span className="relative block aspect-[4/5] w-14 shrink-0 overflow-hidden bg-placeholder">
                {l.imageSnapshot && <Image src={l.imageSnapshot} alt="" fill sizes="56px" className="object-cover" />}
              </span>
              <span className="flex-1 font-serif text-[0.9375rem] leading-snug">
                {l.nameSnapshot} {l.quantity > 1 && <span className="font-sans text-xs text-ink-muted">× {l.quantity}</span>}
                {l.giftWrap && <span className="block font-sans text-xs text-ink-muted">Hediye paketi</span>}
              </span>
              <span className="text-sm tabular-nums">{formatTRY(l.priceKurusSnapshot * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 grid grid-cols-[1fr_auto] gap-y-1.5 border-t border-line pt-4 text-sm">
          <dt className="text-ink-muted">Ara toplam</dt>
          <dd className="text-right tabular-nums">{formatTRY(order.subtotalKurus)}</dd>
          {order.discountKurus > 0 && (
            <>
              <dt className="text-ink-muted">İndirim{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
              <dd className="text-right text-sale tabular-nums">−{formatTRY(order.discountKurus)}</dd>
            </>
          )}
          {order.giftWrapKurus > 0 && (
            <>
              <dt className="text-ink-muted">Hediye paketi</dt>
              <dd className="text-right tabular-nums">{formatTRY(order.giftWrapKurus)}</dd>
            </>
          )}
          <dt className="text-ink-muted">Kargo</dt>
          <dd className="text-right tabular-nums">{order.shippingKurus === 0 ? "Ücretsiz" : formatTRY(order.shippingKurus)}</dd>
          <dt className="mt-2 border-t border-line pt-3 font-medium">Toplam</dt>
          <dd className="mt-2 border-t border-line pt-3 text-right font-medium tabular-nums">{formatTRY(order.totalKurus)}</dd>
        </dl>
      </aside>
    </div>
  );
}
