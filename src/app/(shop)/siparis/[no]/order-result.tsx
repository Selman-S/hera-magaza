"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/ui/button";
import { formatTRY } from "@/lib/money";
import { whatsappLink } from "@/lib/settings";
import { LAST_ORDER_KEY, type LastOrder } from "@/lib/checkout/order";


function readOrder(): string | null {
  try {
    return sessionStorage.getItem(LAST_ORDER_KEY);
  } catch {
    return null;
  }
}

export function OrderResult({ no }: { no: string }) {
  const raw = useSyncExternalStore(
    () => () => {},
    readOrder,
    () => null,
  );
  const order = raw ? (JSON.parse(raw) as LastOrder) : null;
  const matches = order?.no === no;

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-6">
        <p className="kicker mb-4">Sipariş no · {no}</p>
        <h1 className="font-serif text-4xl font-light lg:text-[3.5rem] lg:leading-none">
          Teşekkürler.
          <br />
          <em>Siparişiniz alındı.</em>
        </h1>
        <p className="mt-6 max-w-[46ch] text-ink-muted">
          {matches ? (
            <>
              Sipariş özetini <strong className="font-medium text-ink">{order.email}</strong> adresine gönderdik. Siparişiniz 1–3 iş günü
              içinde hediye kutusunda kargoya verilecek.
            </>
          ) : (
            <>Sipariş özetini e-posta adresinize gönderdik. Siparişiniz 1–3 iş günü içinde kargoya verilecek.</>
          )}
        </p>
        {matches && order.paymentMethod === "havale" && (
          <p className="mt-4 max-w-[46ch] border-l-2 border-ink bg-surface px-4 py-3 text-sm">
            Havale/EFT bilgileri e-postanızda. Açıklamaya sipariş numaranızı ({no}) yazmayı unutmayın.
          </p>
        )}
        <p className="mt-6 rounded-xs border border-dashed border-line px-4 py-3 text-xs text-ink-muted">
          Faz 1 önizlemesi: bu bir deneme siparişidir; ödeme alınmadı ve e-posta gönderilmedi.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/koleksiyon/yeni-gelenler">Alışverişe devam et</ButtonLink>
          <ButtonLink href={whatsappLink(`Merhaba, ${no} numaralı siparişim hakkında yazıyorum.`)} variant="secondary" target="_blank" rel="noopener noreferrer">
            WhatsApp’tan yazın
          </ButtonLink>
        </div>
      </div>
      {matches && (
        <aside aria-label="Sipariş özeti" className="bg-surface p-6 lg:col-span-4 lg:col-start-9">
          <h2 className="mb-5 font-serif text-2xl font-light">Özet</h2>
          <ul className="flex flex-col gap-4">
            {order.lines.map((l) => (
              <li key={l.name} className="flex items-center gap-4">
                <span className="relative block aspect-[4/5] w-14 shrink-0 overflow-hidden bg-placeholder">
                  <Image src={l.image.src} alt="" fill sizes="56px" className="object-cover" />
                </span>
                <span className="flex-1 font-serif text-[0.9375rem] leading-snug">
                  {l.name} {l.quantity > 1 && <span className="font-sans text-xs text-ink-muted">× {l.quantity}</span>}
                </span>
                <span className="text-sm tabular-nums">{formatTRY(l.priceKurus * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 flex justify-between border-t border-line pt-4 font-medium">
            <span>Toplam</span>
            <span className="tabular-nums">{formatTRY(order.totalKurus)}</span>
          </p>
        </aside>
      )}
    </div>
  );
}
